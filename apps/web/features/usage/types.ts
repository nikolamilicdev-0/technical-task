import type { UsageByModel, UsageSummary, UsageTotals } from '@kb/contracts'

import type { Dictionary } from '@/core/i18n/dictionary'

/** What the usage page shows below its header; only a loaded summary carries data. */
export type UsageView =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'summary'; summary: UsageSummary }

/** A totals tile: which count it shows, labelled by `usage.totals.<key>`. */
export type UsageTileKey = keyof Pick<
  UsageTotals,
  'totalTokens' | 'promptTokens' | 'completionTokens' | 'requests'
>

export interface UsageTile {
  key: UsageTileKey
  label: string
  value: string
  /** A qualifier under the value, such as how many counts were estimated. */
  caption: string | null
}

/** One day of the bar list, ready to render. */
export interface UsageDayRow {
  /** `YYYY-MM-DD`, for `<time dateTime>`. */
  day: string
  label: string
  tokens: string
  /** Bar length, 0–100 % of the busiest day. */
  width: number
}

/** A numeric column of the by-model table, labelled by `usage.byModel.columns.<key>`. */
export type UsageModelCountKey = keyof Pick<
  UsageByModel,
  'promptTokens' | 'completionTokens' | 'totalTokens' | 'requests'
>

export type UsageModelColumnKey = 'provider' | 'model' | 'kind' | UsageModelCountKey

export type UsageStrings = Dictionary['usage']
