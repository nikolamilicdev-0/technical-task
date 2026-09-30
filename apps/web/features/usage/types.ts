import type { UsageByModel, UsageSummary, UsageTotals } from '@kb/contracts'

import type { Dictionary } from '@/core/i18n/dictionary'

export type UsageView =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'summary'; summary: UsageSummary }

export type UsageTileKey = keyof Pick<
  UsageTotals,
  'totalTokens' | 'promptTokens' | 'completionTokens' | 'requests'
>

export interface UsageTile {
  key: UsageTileKey
  label: string
  value: string
  caption: string | null
}

export interface UsageDayRow {
  day: string
  label: string
  tokens: string
  width: number
}

export type UsageModelCountKey = keyof Pick<
  UsageByModel,
  'promptTokens' | 'completionTokens' | 'totalTokens' | 'requests'
>

export type UsageModelColumnKey = 'provider' | 'model' | 'kind' | UsageModelCountKey

export type UsageStrings = Dictionary['usage']
