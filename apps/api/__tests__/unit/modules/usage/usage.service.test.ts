import { UNKNOWN_TIME_ZONE_MESSAGE, USAGE_WINDOW_MESSAGE, type UsageSummary } from '@kb/contracts'
import { Test } from '@nestjs/testing'
import { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import { DatabaseRequestError } from '../../../../src/database/database-error.js'
import type { UserContext } from '../../../../src/database/user-context.types.js'
import { UsageRepository } from '../../../../src/modules/usage/usage.repository.js'
import { UsageService } from '../../../../src/modules/usage/usage.service.js'
import { TEST_USER } from '../../../fixtures.js'

const USER: UserContext = {
  userId: TEST_USER.id,
  db: { scopedTo: TEST_USER.id } as unknown as DatabaseClient,
}
const EMPTY: UsageSummary = {
  from: '2026-08-31T12:00:00.000Z',
  to: '2026-09-30T12:00:00.000Z',
  totals: {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    requests: 0,
    estimatedRequests: 0,
  },
  byDay: [],
  byModel: [],
}

const NOW = new Date('2026-09-30T12:00:00.000Z')

function databaseError(code: string, status: number): DatabaseRequestError {
  return new DatabaseRequestError(
    new PostgrestError({ message: 'failed', details: '', hint: '', code }),
    status
  )
}

async function serviceWith(summary: UsageRepository['summary']): Promise<UsageService> {
  const moduleRef = await Test.createTestingModule({
    providers: [UsageService, { provide: UsageRepository, useValue: { summary } }],
  }).compile()
  return moduleRef.get(UsageService)
}

describe('UsageService', () => {
  it('reads the summary through the caller’s client with the defaults filled in', async () => {
    const summary = vi.fn<UsageRepository['summary']>().mockResolvedValue(EMPTY)

    const result = await (await serviceWith(summary)).summary(USER, {}, NOW)

    expect(result).toBe(EMPTY)
    expect(summary).toHaveBeenCalledWith(USER.db, {
      from: '2026-08-31T12:00:00.000Z',
      to: '2026-09-30T12:00:00.000Z',
      timezone: 'UTC',
    })
  })

  it('rejects a start at or after the default end with 422, without querying', async () => {
    const summary = vi.fn<UsageRepository['summary']>()
    const service = await serviceWith(summary)

    const error: unknown = await service
      .summary(USER, { from: NOW.toISOString() }, NOW)
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiHttpException)
    expect((error as ApiHttpException).body).toEqual({
      code: 'invalid_payload',
      messages: ['Invalid request payload'],
      errors: { from: [USAGE_WINDOW_MESSAGE] },
    })
    expect(summary).not.toHaveBeenCalled()
  })

  it('answers 422 for a time zone the database does not know, as the contract would', async () => {
    const summary = vi.fn<UsageRepository['summary']>()
    summary.mockRejectedValue(databaseError('22023', 400))
    const service = await serviceWith(summary)

    const error: unknown = await service
      .summary(USER, { timezone: 'America/Ciudad_Juarez' }, NOW)
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiHttpException)
    expect((error as ApiHttpException).getStatus()).toBe(422)
    expect((error as ApiHttpException).body.errors).toEqual({
      timezone: [UNKNOWN_TIME_ZONE_MESSAGE],
    })
  })

  it('passes other database failures on', async () => {
    const outage = databaseError('', 503)
    const service = await serviceWith(vi.fn<UsageRepository['summary']>().mockRejectedValue(outage))

    await expect(service.summary(USER, {}, NOW)).rejects.toBe(outage)
  })
})
