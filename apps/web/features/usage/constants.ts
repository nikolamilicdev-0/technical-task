import type { UsageModelColumnKey, UsageModelCountKey, UsageTileKey } from '@/features/usage/types'

/** The page covers the last 30 calendar days, today included. */
export const USAGE_PERIOD_DAYS = 30

/** Usage only moves when chat or indexing runs, so a minute-old summary is fresh enough. */
export const USAGE_STALE_TIME_MS = 60_000

/** The totals strip, in reading order. */
export const USAGE_TILE_KEYS = [
  'totalTokens',
  'promptTokens',
  'completionTokens',
  'requests',
] as const satisfies readonly UsageTileKey[]

/** Two tiles per row until four fit side by side. */
export const USAGE_TILE_COLUMNS = { base: 2, xl: 4 } as const

/** Counts of the by-model table, right-aligned after the text columns. */
export const USAGE_MODEL_COUNT_KEYS = [
  'promptTokens',
  'completionTokens',
  'totalTokens',
  'requests',
] as const satisfies readonly UsageModelCountKey[]

/** The count set in a heavier weight, so each row's total stands out. */
export const USAGE_MODEL_EMPHASIZED_COUNT: UsageModelCountKey = 'totalTokens'

export const USAGE_MODEL_COLUMN_KEYS = [
  'provider',
  'model',
  'kind',
  ...USAGE_MODEL_COUNT_KEYS,
] as const satisfies readonly UsageModelColumnKey[]

export const USAGE_SKELETON_DAYS = 5

export const USAGE_SKELETON_MODELS = 3
