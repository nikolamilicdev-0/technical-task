import {
  type CreateDocumentInput,
  type Document,
  type DocumentSummary,
  documentSourceTypeSchema,
  embeddingStatusSchema,
  timestampSchema,
  type UpdateDocumentInput,
} from '@kb/contracts'
import { z } from 'zod'

import { countCodePoints, takeCodePoints } from '../../common/utils/text.js'
import { CONTENT_PREVIEW_LENGTH, POSTGRES_INFINITY } from './documents.constants.js'
import type {
  ContentPreview,
  DocumentInsertRow,
  DocumentRow,
  DocumentSource,
  DocumentSummaryRow,
  DocumentUpdateRow,
} from './documents.types.js'

// PostgREST sends `+00:00` offsets with microseconds; clients get one canonical UTC format.
const timestampColumn = timestampSchema.transform((value) => new Date(value).toISOString())
const countColumn = z.number().int().nonnegative()

// Parsing restores the NOT NULL guarantees that the generated types drop for view columns.
const metadataRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  source_type: documentSourceTypeSchema,
  source_filename: z.string().nullable(),
  embedding_status: embeddingStatusSchema,
  embedding_error: z.string().nullable(),
  embedding_model: z.string().nullable(),
  chunk_count: countColumn,
  ingestion_attempts: countColumn,
  next_attempt_at: z.union([z.literal(POSTGRES_INFINITY).transform(() => null), timestampColumn]),
  created_at: timestampColumn,
  updated_at: timestampColumn,
})
type MetadataRow = z.output<typeof metadataRowSchema>

const summaryRowSchema = metadataRowSchema.extend({
  content_preview: z.string(),
  content_length: countColumn,
})
const documentRowSchema = metadataRowSchema.extend({ content: z.string() })

export function toDocumentSummary(row: DocumentSummaryRow): DocumentSummary {
  const parsed = summaryRowSchema.parse(row)
  return toSummary(parsed, {
    contentPreview: parsed.content_preview,
    contentLength: parsed.content_length,
  })
}

/** The full document; the preview fields are computed the way the summaries view computes them. */
export function toDocument(row: DocumentRow): Document {
  const parsed = documentRowSchema.parse(row)
  const summary = toSummary(parsed, {
    contentPreview: takeCodePoints(parsed.content, CONTENT_PREVIEW_LENGTH),
    contentLength: countCodePoints(parsed.content),
  })
  return { ...summary, content: parsed.content }
}

export function toDocumentInsert(
  { title, content, tags }: CreateDocumentInput,
  source: DocumentSource
): DocumentInsertRow {
  return {
    title,
    content,
    tags,
    source_type: source.type,
    source_filename: source.type === 'upload' ? source.filename : null,
  }
}

/** Only the fields the patch names, so the others keep their stored values. */
export function toDocumentUpdate(input: UpdateDocumentInput): DocumentUpdateRow {
  const row: DocumentUpdateRow = {}
  if (input.title !== undefined) row.title = input.title
  if (input.content !== undefined) row.content = input.content
  if (input.tags !== undefined) row.tags = input.tags
  return row
}

function toSummary(row: MetadataRow, preview: ContentPreview): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    contentPreview: preview.contentPreview,
    contentLength: preview.contentLength,
    tags: row.tags,
    sourceType: row.source_type,
    sourceFilename: row.source_filename,
    embeddingStatus: row.embedding_status,
    embeddingError: row.embedding_error,
    embeddingModel: row.embedding_model,
    chunkCount: row.chunk_count,
    ingestionAttempts: row.ingestion_attempts,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
