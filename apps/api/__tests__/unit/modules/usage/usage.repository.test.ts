import { describe, expect, it } from 'vitest'

import { DatabaseRequestError } from '../../../../src/database/database-error.js'
import { UsageRepository } from '../../../../src/modules/usage/usage.repository.js'
import { fakeDatabase } from '../../../fakes/fake-database.js'

const repository = new UsageRepository()
const WINDOW = {
  from: '2026-08-31T12:00:00.000Z',
  to: '2026-09-30T12:00:00.000Z',
  timezone: 'Europe/Paris',
}
const TOKENS = { promptTokens: 1_200, completionTokens: 80, totalTokens: 1_280 }

/** What `usage_summary` returns: jsonb with Postgres timestamps. */
const SUMMARY_JSON = {
  from: '2026-08-31T12:00:00.123456+00:00',
  to: '2026-09-30T12:00:00+00:00',
  totals: { ...TOKENS, requests: 3, estimatedRequests: 1 },
  byDay: [{ day: '2026-09-30', ...TOKENS, requests: 3 }],
  byModel: [
    { provider: 'gemini', model: 'gemini-3.5-flash-lite', kind: 'chat', ...TOKENS, requests: 1 },
  ],
}

describe('UsageRepository', () => {
  it('calls usage_summary with the window and returns the validated summary', async () => {
    const { db, queries } = fakeDatabase({ data: SUMMARY_JSON })

    const summary = await repository.summary(db, WINDOW)

    expect(queries).toEqual([
      [
        {
          method: 'rpc',
          args: [
            'usage_summary',
            { p_from: WINDOW.from, p_to: WINDOW.to, p_timezone: 'Europe/Paris' },
          ],
        },
      ],
    ])
    expect(summary).toEqual({
      ...SUMMARY_JSON,
      from: '2026-08-31T12:00:00.123Z',
      to: '2026-09-30T12:00:00.000Z',
    })
  })

  it('rejects a result that does not match the contract', async () => {
    const { db } = fakeDatabase({ data: { ...SUMMARY_JSON, byModel: [{ kind: 'billing' }] } })

    await expect(repository.summary(db, WINDOW)).rejects.toThrow()
  })

  it('throws failures with their HTTP status', async () => {
    const failure = { code: '22023', message: 'time zone "Mars/Base" not recognized' }
    const { db } = fakeDatabase({ error: failure, status: 400 })

    const rejection = repository.summary(db, WINDOW)

    await expect(rejection).rejects.toBeInstanceOf(DatabaseRequestError)
    await expect(rejection).rejects.toMatchObject({ status: 400, code: '22023' })
  })
})
