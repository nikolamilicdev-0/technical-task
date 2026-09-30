import type { DocumentSource } from './documents.types.js'

export const DOCUMENT_ID_PARAM = 'id'
export const DOCUMENT_ITEM_ROUTE = `:${DOCUMENT_ID_PARAM}`

export const DOCUMENT_NOT_FOUND_MESSAGE = 'Document not found'

export const EDITOR_SOURCE: DocumentSource = { type: 'editor' }

/** Mirrors `left(content, 240)` in the `document_summaries` view. */
export const CONTENT_PREVIEW_LENGTH = 240

/** How PostgREST serialises `next_attempt_at` once no automatic retry is scheduled. */
export const POSTGRES_INFINITY = 'infinity'

// Literal select lists: supabase-js infers the row types from their text.
const DOCUMENT_METADATA_COLUMNS = `id, title, tags, source_type, source_filename,
  embedding_status, embedding_error, embedding_model, chunk_count, ingestion_attempts,
  next_attempt_at, created_at, updated_at`
export const DOCUMENT_SUMMARY_COLUMNS =
  `${DOCUMENT_METADATA_COLUMNS}, content_preview, content_length` as const
export const DOCUMENT_COLUMNS = `${DOCUMENT_METADATA_COLUMNS}, content` as const
