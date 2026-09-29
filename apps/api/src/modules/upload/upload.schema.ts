import { createDocumentSchema } from '@kb/contracts'
import { z } from 'zod'

// Multipart forms send every input, so a blank value means the field was left empty.
function blankAsMissing(value: unknown): unknown {
  return typeof value === 'string' && value.trim() === '' ? undefined : value
}

// One `tags` part arrives as a string, repeated parts as an array.
function toTagList(value: unknown): unknown {
  if (value === undefined) return undefined
  const tags: unknown[] = Array.isArray(value) ? value : [value]
  return tags.filter((tag) => blankAsMissing(tag) !== undefined)
}

/** The optional text parts next to the file, validated like the fields of a created document. */
export const uploadFieldsSchema = z
  .object({
    title: z.preprocess(blankAsMissing, createDocumentSchema.shape.title.optional()),
    tags: z.preprocess(toTagList, createDocumentSchema.shape.tags),
  })
  // A request that is not multipart may carry no body at all; the missing file is reported instead.
  .prefault({})
