import { EMBEDDING_DIMENSIONS_DEFAULT } from '@kb/contracts'

import type { Database } from './database.types.js'

/** Size of `document_chunks.embedding`; smaller embeddings are zero-padded to it (DEC-014). */
export const VECTOR_DIMENSIONS = EMBEDDING_DIMENSIONS_DEFAULT

/** Postgres functions reached through PostgREST `rpc()`, checked against the generated types. */
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
} as const satisfies Record<string, keyof Database['public']['Functions']>

/** Server-side clients never store, refresh or detect a session. */
export const STATELESS_AUTH = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const
