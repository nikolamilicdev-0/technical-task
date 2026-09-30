import type { UsageSummaryQuery } from '@kb/contracts'

import {
  MS_PER_DAY,
  USAGE_SUMMARY_DEFAULT_DAYS,
  USAGE_SUMMARY_DEFAULT_TIMEZONE,
} from './usage.constants.js'
import type { UsageWindow } from './usage.types.js'

/** The query's window with defaults: up to `now`, the 30 days before `to`, in UTC. */
export function resolveUsageWindow(query: UsageSummaryQuery, now: Date): UsageWindow {
  const to = query.to ?? now.toISOString()
  const defaultFrom = new Date(Date.parse(to) - USAGE_SUMMARY_DEFAULT_DAYS * MS_PER_DAY)
  return {
    from: query.from ?? defaultFrom.toISOString(),
    to,
    timezone: query.timezone ?? USAGE_SUMMARY_DEFAULT_TIMEZONE,
  }
}
