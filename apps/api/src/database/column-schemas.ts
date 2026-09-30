import { timestampSchema } from '@kb/contracts'
import { z } from 'zod'

/** PostgREST sends `+00:00` offsets with microseconds; clients get one canonical UTC format. */
export const timestampColumn = timestampSchema.transform((value) => new Date(value).toISOString())

/** A non-negative integer column: counts and token totals. */
export const countColumn = z.number().int().nonnegative()
