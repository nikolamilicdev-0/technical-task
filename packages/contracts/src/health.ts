import { z } from 'zod'

export const healthSchema = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number().nonnegative(),
  version: z.string().min(1),
})
export type Health = z.infer<typeof healthSchema>

export const READINESS_STATUSES = ['ok', 'error'] as const
export const DATABASE_CHECK_STATUSES = ['ok', 'error'] as const
export const EMBEDDING_DIMENSIONS_CHECK_STATUSES = ['ok', 'mismatch', 'unknown'] as const
export const AI_CHECK_STATUSES = ['ok', 'unconfigured'] as const

export const readinessSchema = z.object({
  status: z.enum(READINESS_STATUSES),
  checks: z.object({
    database: z.enum(DATABASE_CHECK_STATUSES),
    embeddingDimensions: z.enum(EMBEDDING_DIMENSIONS_CHECK_STATUSES),
    ai: z.enum(AI_CHECK_STATUSES),
  }),
})
export type Readiness = z.infer<typeof readinessSchema>
