import type { IngestionSettings } from '../../config/app-config.types.js'
import type { DatabaseClient } from '../../database/database-client.types.js'
import type { Database } from '../../database/database.types.js'
import type { DocumentChunk } from './chunking/chunker.types.js'

type Functions = Database['public']['Functions']

/** A `claim_pending_documents` row. */
export type ClaimedDocumentRow = Functions['claim_pending_documents']['Returns'][number]

/** A document the worker claimed; `attempt` is 1 on the first run since it was queued. */
export interface ClaimedDocument {
  readonly id: string
  readonly userId: string
  readonly title: string
  readonly content: string
  readonly contentHash: string
  readonly attempt: number
}

/** What every step of indexing one claimed document works with. */
export interface IndexingRun {
  /** The service-role client: the worker writes chunks no user may write. */
  readonly db: DatabaseClient
  readonly document: ClaimedDocument
  /** The embedding model signature the chunks are stored under (DEC-014). */
  readonly signature: string
}

/** How many documents one claim takes, when a claim goes stale and when retries stop. */
export type ClaimOptions = Pick<
  IngestionSettings,
  'batchSize' | 'staleAfterMinutes' | 'maxAttempts'
>

/** A chunk to store with its pgvector literal, or null to keep the vector stored for its hash. */
export type ChunkUpsert = Omit<DocumentChunk, 'embeddingInput'> & {
  readonly embedding: string | null
}

/** One element of the `p_chunks` array of `upsert_document_chunks`. */
export type ChunkPayload = {
  chunk_index: number
  content: string
  heading_path: string
  token_count: number
  content_hash: string
  embedding: string | null
}

/** Why a run failed, and whether another attempt may succeed. */
export interface IngestionFailure {
  /** Stored in `documents.embedding_error`: says what went wrong without internals. */
  readonly message: string
  readonly retryable: boolean
  /** The provider's own hint; an automatic retry never comes sooner. */
  readonly retryAfterSeconds?: number
  /** False for errors nothing anticipates (bugs), which are logged with their stack. */
  readonly expected: boolean
}

/** How processing one claimed document ended. */
export type IngestionOutcome =
  | {
      readonly status: 'ready'
      readonly chunkCount: number
      readonly embedded: number
      readonly reused: number
    }
  | { readonly status: 'stale' }
  | { readonly status: 'failed'; readonly message: string; readonly retryInSeconds: number | null }
