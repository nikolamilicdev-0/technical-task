import { apiErrorSchema, type UsageSummary, usageSummarySchema } from '@kb/contracts'
import { PostgrestError } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { DatabaseClient } from '../../src/database/database-client.types.js'
import { DatabaseRequestError } from '../../src/database/database-error.js'
import { UsageRepository } from '../../src/modules/usage/usage.repository.js'
import type { UsageWindow } from '../../src/modules/usage/usage.types.js'
import { TestApp } from '../fakes/test-app.js'

const TOKENS = { promptTokens: 1_200, completionTokens: 80, totalTokens: 1_280 }
const SUMMARY: UsageSummary = {
  from: '2026-08-31T12:00:00.000Z',
  to: '2026-09-30T12:00:00.000Z',
  totals: { ...TOKENS, requests: 3, estimatedRequests: 1 },
  byDay: [{ day: '2026-09-30', ...TOKENS, requests: 3 }],
  byModel: [
    { provider: 'gemini', model: 'gemini-3.5-flash-lite', kind: 'chat', ...TOKENS, requests: 1 },
  ],
}

// Valid for `Intl`; the fake database below plays a Postgres whose tzdata lacks it.
const ZONE_THE_DATABASE_LACKS = 'America/Ciudad_Juarez'
const UNKNOWN_ZONE = { message: 'time zone not recognized', details: '', hint: '', code: '22023' }

const windows: UsageWindow[] = []
let api: TestApp

beforeAll(async () => {
  const summary = (_db: DatabaseClient, window: UsageWindow): Promise<UsageSummary> => {
    windows.push(window)
    if (window.timezone === ZONE_THE_DATABASE_LACKS) {
      return Promise.reject(new DatabaseRequestError(new PostgrestError(UNKNOWN_ZONE), 400))
    }
    return Promise.resolve(SUMMARY)
  }
  api = await TestApp.start((builder) =>
    builder.overrideProvider(UsageRepository).useValue({ summary })
  )
})

afterAll(async () => {
  await api.close()
})

describe('usage summary over HTTP', () => {
  it('returns totals, days and models for the last 30 days in UTC by default', async () => {
    const { response, body } = await api.call('/usage/summary', { headers: api.signIn() })

    expect(response.status).toBe(200)
    expect(usageSummarySchema.parse(body)).toEqual(SUMMARY)
    const window = windows.at(-1)
    expect(window?.timezone).toBe('UTC')
    expect(Date.parse(window?.to ?? '') - Date.parse(window?.from ?? '')).toBe(30 * 86_400_000)
  })

  it('passes an explicit window and time zone through', async () => {
    const query = 'from=2026-09-01T00:00:00Z&to=2026-09-15T00:00:00Z&timezone=Europe/Paris'

    await api.call(`/usage/summary?${query}`, { headers: api.signIn() })

    expect(windows.at(-1)).toEqual({
      from: '2026-09-01T00:00:00Z',
      to: '2026-09-15T00:00:00Z',
      timezone: 'Europe/Paris',
    })
  })

  it.each([
    ['an unknown time zone', 'timezone=Mars/Olympus', 'timezone'],
    [
      'a window that ends before it starts',
      'from=2026-09-15T00:00:00Z&to=2026-09-01T00:00:00Z',
      'to',
    ],
    ['a start after the default end', 'from=2999-01-01T00:00:00Z', 'from'],
    ['a zone the database does not know', `timezone=${ZONE_THE_DATABASE_LACKS}`, 'timezone'],
  ])('rejects %s with 422', async (_, query, field) => {
    const { response, body } = await api.call(`/usage/summary?${query}`, { headers: api.signIn() })

    expect(response.status).toBe(422)
    expect(apiErrorSchema.parse(body).errors).toHaveProperty(field)
  })

  it('requires a signed-in caller', async () => {
    expect((await api.call('/usage/summary')).response.status).toBe(401)
  })
})
