// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { buildUsageSummary, buildUsageTotals } from '@/__tests__/fixtures/usage'
import { toUsageDayRows, toUsageTiles } from '@/features/usage/lib/format-usage'
import { getUsageView } from '@/features/usage/lib/get-usage-view'
import { toUsageQuery } from '@/features/usage/lib/usage-window'
import en from '@/messages/en.json'

const MS_PER_DAY = 86_400_000

describe('toUsageQuery', () => {
  it('starts at local midnight so the period is exactly `days` calendar days, today included', () => {
    const now = new Date(2026, 8, 30, 15, 45)
    const { from, timezone } = toUsageQuery(30, now, 'Europe/Paris')
    const start = new Date(from ?? '')
    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2026, 8, 1])
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0])
    expect(timezone).toBe('Europe/Paris')
  })

  it('leaves the end to the API clock and drops a time zone the API would reject', () => {
    const now = new Date(2026, 8, 30, 15, 45)
    const query = toUsageQuery(7, now, '+03:30')
    expect(Object.keys(query)).toEqual(['from'])
    expect(now.getTime() - Date.parse(query.from ?? '')).toBeLessThan(7 * MS_PER_DAY)
  })
})

describe('getUsageView', () => {
  it('shows the skeleton until the first response, and the error state when it fails', () => {
    expect(getUsageView(undefined, false)).toEqual({ status: 'loading' })
    expect(getUsageView(undefined, true)).toEqual({ status: 'error' })
  })

  it('treats a period without requests as empty and keeps loaded data over a failed refetch', () => {
    const idle = buildUsageSummary({ totals: buildUsageTotals({ requests: 0, totalTokens: 0 }) })
    expect(getUsageView(idle, false)).toEqual({ status: 'empty' })
    const summary = buildUsageSummary()
    expect(getUsageView(summary, true)).toEqual({ status: 'summary', summary })
  })
})

describe('toUsageTiles', () => {
  it('formats the four totals and notes estimates on the token total only', () => {
    const tiles = toUsageTiles(en.usage, buildUsageTotals({ estimatedRequests: 3 }))
    expect(tiles.map(({ label, value }) => [label, value])).toEqual([
      ['Total tokens', '12,412'],
      ['Prompt tokens', '11,531'],
      ['Completion tokens', '881'],
      ['Requests', '40'],
    ])
    expect(tiles.map((tile) => tile.caption)).toEqual([
      'Includes estimates for 3 requests',
      null,
      null,
      null,
    ])
  })
})

describe('toUsageDayRows', () => {
  it('lists the newest day first and sizes bars against the busiest day', () => {
    const rows = toUsageDayRows(buildUsageSummary().byDay)
    expect(rows.map(({ day, label, tokens }) => [day, label, tokens])).toEqual([
      ['2026-09-30', 'Sep 30', '10,312'],
      ['2026-09-29', 'Sep 29', '2,100'],
    ])
    expect(rows[0]?.width).toBe(100)
    expect(rows[1]?.width).toBeCloseTo((2_100 / 10_312) * 100)
  })
})
