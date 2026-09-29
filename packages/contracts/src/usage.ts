import { z } from 'zod'

import { timestampSchema, tokenCountSchema } from './common.js'

export const USAGE_KINDS = ['chat', 'embedding', 'query_rewrite'] as const
export const usageKindSchema = z.enum(USAGE_KINDS)
export type UsageKind = z.infer<typeof usageKindSchema>

// IANA names only: Postgres reads numeric offsets such as `+01:00` with inverted (POSIX) sign.
const IANA_TIME_ZONE_PATTERN = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/

function isIanaTimeZone(value: string): boolean {
  if (!IANA_TIME_ZONE_PATTERN.test(value)) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export const usageSummaryQuerySchema = z
  .object({
    from: timestampSchema.optional(),
    to: timestampSchema.optional(),
    timezone: z.string().refine(isIanaTimeZone, { message: 'Unknown IANA time zone' }).optional(),
  })
  .refine(({ from, to }) => !from || !to || Date.parse(from) < Date.parse(to), {
    message: '`from` must be earlier than `to`',
    path: ['to'],
  })
export type UsageSummaryQuery = z.infer<typeof usageSummaryQuerySchema>

const requestCountSchema = z.number().int().nonnegative()

const tokenTotalsShape = {
  promptTokens: tokenCountSchema,
  completionTokens: tokenCountSchema,
  totalTokens: tokenCountSchema,
  requests: requestCountSchema,
}

export const usageTotalsSchema = z.object({
  ...tokenTotalsShape,
  estimatedRequests: requestCountSchema,
})
export type UsageTotals = z.infer<typeof usageTotalsSchema>

export const usageByDaySchema = z.object({
  day: z.iso.date(),
  ...tokenTotalsShape,
})
export type UsageByDay = z.infer<typeof usageByDaySchema>

export const usageByModelSchema = z.object({
  provider: z.string(),
  model: z.string(),
  kind: usageKindSchema,
  ...tokenTotalsShape,
})
export type UsageByModel = z.infer<typeof usageByModelSchema>

export const usageSummarySchema = z.object({
  from: timestampSchema,
  to: timestampSchema,
  totals: usageTotalsSchema,
  byDay: z.array(usageByDaySchema),
  byModel: z.array(usageByModelSchema),
})
export type UsageSummary = z.infer<typeof usageSummarySchema>
