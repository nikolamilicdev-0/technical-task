import type { Document } from '@kb/contracts'

import type {
  DocumentRow,
  DocumentSummaryRow,
} from '../../src/modules/documents/documents.types.js'

export const TEST_DOCUMENT_ID = '3f2b8c1d-5e6a-4b7c-9d8e-0f1a2b3c4d5e'

/** How PostgREST serialises a timestamptz: an offset and microseconds. */
export const POSTGREST_TIMESTAMP = '2026-09-29T20:48:22.687123+00:00'
/** The same instant the way the API returns it. */
export const API_TIMESTAMP = '2026-09-29T20:48:22.687Z'

const CONTENT = '# Release notes\n\nShipped uploads.'

export function buildDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: TEST_DOCUMENT_ID,
    title: 'Release notes',
    contentPreview: CONTENT,
    contentLength: CONTENT.length,
    tags: ['release'],
    sourceType: 'editor',
    sourceFilename: null,
    embeddingStatus: 'pending',
    embeddingError: null,
    embeddingModel: null,
    chunkCount: 0,
    ingestionAttempts: 0,
    nextAttemptAt: API_TIMESTAMP,
    createdAt: API_TIMESTAMP,
    updatedAt: API_TIMESTAMP,
    content: CONTENT,
    ...overrides,
  }
}

export function buildDocumentRow(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: TEST_DOCUMENT_ID,
    title: 'Release notes',
    content: CONTENT,
    tags: ['release'],
    source_type: 'editor',
    source_filename: null,
    embedding_status: 'pending',
    embedding_error: null,
    embedding_model: null,
    chunk_count: 0,
    ingestion_attempts: 0,
    next_attempt_at: POSTGREST_TIMESTAMP,
    created_at: POSTGREST_TIMESTAMP,
    updated_at: POSTGREST_TIMESTAMP,
    ...overrides,
  }
}

export function buildDocumentSummaryRow(
  overrides: Partial<DocumentSummaryRow> = {}
): DocumentSummaryRow {
  const { content, ...row } = buildDocumentRow()
  return { ...row, content_preview: content, content_length: content.length, ...overrides }
}
