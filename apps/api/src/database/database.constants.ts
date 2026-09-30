import { EMBEDDING_DIMENSIONS_DEFAULT } from '@kb/contracts'

import type { Database } from './database.types.js'

export const VECTOR_DIMENSIONS = EMBEDDING_DIMENSIONS_DEFAULT

type PublicSchema = Database['public']

export const DATABASE_RELATIONS = {
  conversations: 'conversations',
  documentChunks: 'document_chunks',
  documentSummaries: 'document_summaries',
  documents: 'documents',
  messages: 'messages',
  usageEvents: 'usage_events',
} as const satisfies Record<string, keyof PublicSchema['Tables'] | keyof PublicSchema['Views']>

export const POSTGREST_ERROR_CODES = {
  /** An offset past the last row of a counted request (HTTP 416). */
  rangeNotSatisfiable: 'PGRST103',
} as const

export const DATABASE_FUNCTIONS = {
  claimPendingDocuments: 'claim_pending_documents',
  embeddingColumnDimensions: 'embedding_column_dimensions',
  finalizeDocumentIngestion: 'finalize_document_ingestion',
  markDocumentIngestionFailed: 'mark_document_ingestion_failed',
  matchChunks: 'match_chunks',
  requeueDocuments: 'requeue_documents',
  requeueDocumentsForModel: 'requeue_documents_for_model',
  searchChunksKeyword: 'search_chunks_keyword',
  upsertDocumentChunks: 'upsert_document_chunks',
  usageSummary: 'usage_summary',
} as const satisfies Record<string, keyof PublicSchema['Functions']>

export const STATELESS_AUTH = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const
