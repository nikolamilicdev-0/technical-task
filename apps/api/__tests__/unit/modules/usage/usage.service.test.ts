import type { UsageSummary } from '@kb/contracts'
import { Test } from '@nestjs/testing'
import { describe, expect, it, vi } from 'vitest'

import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
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

describe('UsageService', () => {
  it('reads the summary through the caller’s client with the defaults filled in', async () => {
    const summary = vi.fn<UsageRepository['summary']>().mockResolvedValue(EMPTY)
    const moduleRef = await Test.createTestingModule({
      providers: [UsageService, { provide: UsageRepository, useValue: { summary } }],
    }).compile()

    const result = await moduleRef
      .get(UsageService)
      .summary(USER, {}, new Date('2026-09-30T12:00:00.000Z'))

    expect(result).toBe(EMPTY)
    expect(summary).toHaveBeenCalledWith(USER.db, {
      from: '2026-08-31T12:00:00.000Z',
      to: '2026-09-30T12:00:00.000Z',
      timezone: 'UTC',
    })
  })
})
