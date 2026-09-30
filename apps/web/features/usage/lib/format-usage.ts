import type { UsageByDay, UsageTotals } from '@kb/contracts'

import { formatDay } from '@/core/utils/format-date'
import { formatNumber } from '@/core/utils/format-number'
import { USAGE_TILE_KEYS } from '@/features/usage/constants'
import { computeBarWidths } from '@/features/usage/lib/compute-bar-widths'
import { describeEstimated } from '@/features/usage/lib/usage-strings'
import type { UsageDayRow, UsageStrings, UsageTile } from '@/features/usage/types'

export function toUsageTiles(strings: UsageStrings, totals: UsageTotals): UsageTile[] {
  return USAGE_TILE_KEYS.map((key) => ({
    key,
    label: strings.totals[key],
    value: formatNumber(totals[key]),
    caption: key === 'totalTokens' ? describeEstimated(strings, totals.estimatedRequests) : null,
  }))
}

export function toUsageDayRows(days: readonly UsageByDay[]): UsageDayRow[] {
  const newestFirst = [...days].sort((left, right) => right.day.localeCompare(left.day))
  const widths = computeBarWidths(newestFirst.map((day) => day.totalTokens))
  return newestFirst.map((day, index) => ({
    day: day.day,
    label: formatDay(day.day),
    tokens: formatNumber(day.totalTokens),
    width: widths[index] ?? 0,
  }))
}
