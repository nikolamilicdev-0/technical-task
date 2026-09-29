import { usageSummaryQuerySchema, usageSummarySchema } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { ISO_TIMESTAMP, issuePaths, POSTGRES_TIMESTAMP } from '../fixtures.js'

const totals = { promptTokens: 1_200, completionTokens: 300, totalTokens: 1_500, requests: 4 }

const summary = {
  from: '2026-08-30T10:00:00.123456+00:00',
  to: POSTGRES_TIMESTAMP,
  totals: { ...totals, estimatedRequests: 1 },
  byDay: [{ day: '2026-09-29', ...totals }],
  byModel: [{ provider: 'openai', model: 'gpt-4o-mini', kind: 'chat', ...totals }],
}

describe('usageSummaryQuerySchema', () => {
  it.each([
    ['no filters (server defaults to the last 30 days)', {}],
    ['an explicit window', { from: '2026-09-01T00:00:00Z', to: ISO_TIMESTAMP }],
    [
      'a window with numeric offsets',
      { from: '2026-09-01T00:00:00+02:00', to: POSTGRES_TIMESTAMP },
    ],
    ['UTC', { timezone: 'UTC' }],
    ['a region/city zone', { timezone: 'Europe/Berlin' }],
    ['a three-part zone', { timezone: 'America/Argentina/Buenos_Aires' }],
    ['an Etc offset zone', { timezone: 'Etc/GMT+5' }],
  ])('accepts %s', (_, input) => {
    expect(usageSummaryQuerySchema.safeParse(input).success).toBe(true)
  })

  it.each([
    ['an unknown zone', { timezone: 'Mars/Olympus_Mons' }, 'timezone'],
    ['a numeric offset instead of a zone', { timezone: '+01:00' }, 'timezone'],
    ['free text', { timezone: 'central european time' }, 'timezone'],
    ['a non-ISO date', { from: '2026-09-01' }, 'from'],
    ['an empty window', { from: ISO_TIMESTAMP, to: ISO_TIMESTAMP }, 'to'],
    ['a reversed window', { from: ISO_TIMESTAMP, to: '2026-09-01T00:00:00Z' }, 'to'],
  ])('rejects %s', (_, input, path) => {
    expect(issuePaths(usageSummaryQuerySchema, input)).toContain(path)
  })
})

describe('usageSummarySchema', () => {
  it('accepts the shape produced by the usage_summary SQL function', () => {
    expect(usageSummarySchema.safeParse(summary).success).toBe(true)
  })

  it('accepts a period without usage', () => {
    const empty = {
      ...summary,
      totals: {
        ...totals,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requests: 0,
        estimatedRequests: 0,
      },
      byDay: [],
      byModel: [],
    }
    expect(usageSummarySchema.safeParse(empty).success).toBe(true)
  })

  it.each([
    ['a non-calendar day', { byDay: [{ ...summary.byDay[0], day: '2026-9-29' }] }, 'byDay.0.day'],
    [
      'an unknown usage kind',
      { byModel: [{ ...summary.byModel[0], kind: 'rerank' }] },
      'byModel.0.kind',
    ],
    ['negative totals', { totals: { ...summary.totals, totalTokens: -5 } }, 'totals.totalTokens'],
  ])('rejects %s', (_, overrides, path) => {
    expect(issuePaths(usageSummarySchema, { ...summary, ...overrides })).toContain(path)
  })
})
