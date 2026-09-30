import type { UsageByModel, UsageSummary, UsageTotals } from '@kb/contracts'

export function buildUsageTotals(overrides: Partial<UsageTotals> = {}): UsageTotals {
  return {
    promptTokens: 11_531,
    completionTokens: 881,
    totalTokens: 12_412,
    requests: 40,
    estimatedRequests: 0,
    ...overrides,
  }
}

export const USAGE_BY_MODEL: readonly UsageByModel[] = [
  {
    provider: 'gemini',
    model: 'gemini-3.5-flash-lite',
    kind: 'chat',
    promptTokens: 7_445,
    completionTokens: 737,
    totalTokens: 8_182,
    requests: 13,
  },
  {
    provider: 'gemini',
    model: 'gemini-3.5-flash-lite',
    kind: 'query_rewrite',
    promptTokens: 3_692,
    completionTokens: 144,
    totalTokens: 3_836,
    requests: 10,
  },
  {
    provider: 'gemini',
    model: 'gemini-embedding-001',
    kind: 'embedding',
    promptTokens: 394,
    completionTokens: 0,
    totalTokens: 394,
    requests: 17,
  },
]

export function buildUsageSummary(overrides: Partial<UsageSummary> = {}): UsageSummary {
  return {
    from: '2026-09-01T00:00:00.000Z',
    to: '2026-09-30T12:00:00.000Z',
    totals: buildUsageTotals(),
    byDay: [
      {
        day: '2026-09-29',
        promptTokens: 2_000,
        completionTokens: 100,
        totalTokens: 2_100,
        requests: 8,
      },
      {
        day: '2026-09-30',
        promptTokens: 9_531,
        completionTokens: 781,
        totalTokens: 10_312,
        requests: 32,
      },
    ],
    byModel: [...USAGE_BY_MODEL],
    ...overrides,
  }
}
