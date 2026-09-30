import { z } from 'zod'

import {
  idSchema,
  paginatedSchema,
  paginationQuerySchema,
  timestampSchema,
  withoutNul,
} from './common.js'
import { DOCUMENT_CONTENT_MAX, DOCUMENT_TITLE_MAX, MAX_TAGS, TAG_MAX_LENGTH } from './limits.js'

export const EMBEDDING_STATUSES = ['pending', 'processing', 'ready', 'failed'] as const
export const embeddingStatusSchema = z.enum(EMBEDDING_STATUSES)
export type EmbeddingStatus = z.infer<typeof embeddingStatusSchema>

export const DOCUMENT_SOURCE_TYPES = ['editor', 'upload'] as const
export const documentSourceTypeSchema = z.enum(DOCUMENT_SOURCE_TYPES)
export type DocumentSourceType = z.infer<typeof documentSourceTypeSchema>

export const documentTitleSchema = withoutNul(z.string().trim().min(1).max(DOCUMENT_TITLE_MAX))
export const BLANK_CONTENT_MESSAGE = 'Must contain more than whitespace'

export const documentContentSchema = withoutNul(
  z
    .string()
    .min(1)
    .max(DOCUMENT_CONTENT_MAX)
    .refine((content) => content.trim() !== '', {
      message: BLANK_CONTENT_MESSAGE,
      when: ({ issues }) => issues.length === 0,
    })
)
export const tagSchema = withoutNul(z.string().trim().min(1).max(TAG_MAX_LENGTH))
export const tagsSchema = z
  .array(tagSchema)
  .max(MAX_TAGS)
  .transform((tags) => [...new Set(tags)])

export const documentSummarySchema = z.object({
  id: idSchema,
  title: z.string(),
  contentPreview: z.string(),
  contentLength: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  sourceType: documentSourceTypeSchema,
  sourceFilename: z.string().nullable(),
  embeddingStatus: embeddingStatusSchema,
  embeddingError: z.string().nullable(),
  embeddingModel: z.string().nullable(),
  chunkCount: z.number().int().nonnegative(),
  ingestionAttempts: z.number().int().nonnegative(),
  // null = no automatic retry scheduled (Postgres stores `infinity` after a terminal failure).
  nextAttemptAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})
export type DocumentSummary = z.infer<typeof documentSummarySchema>

export const documentSchema = documentSummarySchema.extend({ content: z.string() })
export type Document = z.infer<typeof documentSchema>

const documentFields = {
  title: documentTitleSchema,
  content: documentContentSchema,
  tags: tagsSchema,
}

export const createDocumentSchema = z.object({
  ...documentFields,
  tags: documentFields.tags.default([]),
})
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>

// Built from the undefaulted fields: `.partial()` would still apply `tags` defaults and wipe tags.
export const updateDocumentSchema = z
  .object(documentFields)
  .partial()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  })
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>

export const listDocumentsQuerySchema = paginationQuerySchema.extend({
  search: withoutNul(z.string().trim().min(1).max(DOCUMENT_TITLE_MAX)).optional(),
  tag: tagSchema.optional(),
  status: embeddingStatusSchema.optional(),
})
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>

export const documentListSchema = paginatedSchema(documentSummarySchema)
export type DocumentList = z.infer<typeof documentListSchema>

export const reindexResultSchema = z.object({ queued: z.number().int().nonnegative() })
export type ReindexResult = z.infer<typeof reindexResultSchema>
