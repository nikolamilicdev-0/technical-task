import { z } from 'zod'

import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from './limits.js'

export const idSchema = z.uuid()

// Postgres serialises timestamptz with a numeric offset (`+00:00`), not only `Z`.
export const timestampSchema = z.iso.datetime({ offset: true })

export const tokenCountSchema = z.number().int().nonnegative()

// Postgres `text` cannot store U+0000; one reaching the database fails the request with a 500.
const NUL_CHARACTER = '\u0000'
export const NUL_CHARACTER_MESSAGE = 'Must not contain NUL (U+0000) characters'

export function withoutNul<TSchema extends z.ZodType<string>>(schema: TSchema): TSchema {
  return schema.refine((value) => !value.includes(NUL_CHARACTER), {
    message: NUL_CHARACTER_MESSAGE,
  })
}

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
  offset: z.coerce.number().int().nonnegative().default(0),
})
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function paginatedSchema<TItem extends z.ZodType>(item: TItem) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  })
}
