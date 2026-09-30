import { type UsageSummaryQuery, usageSummaryQuerySchema } from '@kb/contracts'

/** The viewer's IANA time zone, such as `Europe/Paris`; undefined where the runtime has none. */
export function getViewerTimeZone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * The last `days` calendar days, today included, bucketed in the viewer's time zone (dropped for
 * the API's UTC default when invalid). The window ends at the API's clock, so no `to` is sent.
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
