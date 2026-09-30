import { type UsageSummaryQuery, usageSummaryQuerySchema } from '@kb/contracts'

function getViewerTimeZone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * From local midnight `days - 1` days ago, bucketed in the viewer's zone (dropped for the API's UTC
 * default when invalid); no `to` is sent, so the window ends at the API's clock (DEC-032).
 */
export function toUsageQuery(
  days: number,
  now: Date,
  timezone: string | undefined = getViewerTimeZone()
): UsageSummaryQuery {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))
  const query = { from: start.toISOString(), timezone }
  return usageSummaryQuerySchema.safeParse(query).success ? query : { from: query.from }
}
