import { describe, expect, it } from 'vitest'

import { resolveUsageWindow } from '../../../../src/modules/usage/usage-window.js'

const NOW = new Date('2026-09-30T12:00:00.000Z')

describe('resolveUsageWindow', () => {
  it('covers the 30 days up to now, in UTC, by default', () => {
    expect(resolveUsageWindow({}, NOW)).toEqual({
      from: '2026-08-31T12:00:00.000Z',
      to: '2026-09-30T12:00:00.000Z',
      timezone: 'UTC',
    })
  })

  it('counts the default 30 days back from an explicit end', () => {
    expect(resolveUsageWindow({ to: '2026-03-01T00:00:00Z' }, NOW)).toMatchObject({
      from: '2026-01-30T00:00:00.000Z',
      to: '2026-03-01T00:00:00Z',
    })
  })

  it('keeps every value the query gives', () => {
    const query = {
      from: '2026-09-01T00:00:00+02:00',
      to: '2026-09-15T00:00:00+02:00',
      timezone: 'Europe/Paris',
    }

    expect(resolveUsageWindow(query, NOW)).toEqual(query)
  })
})
