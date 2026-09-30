import { Injectable } from '@nestjs/common'

import type { DatabaseClient } from '../../database/database-client.types.js'
import { DATABASE_FUNCTIONS, DATABASE_RELATIONS } from '../../database/database.constants.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import { STALE_CONTENT_RESULT } from './ingestion.constants.js'
import { toChunkPayload, toClaimedDocument } from './ingestion.mapper.js'
import type {
  ChunkUpsert,
  ClaimedDocument,
  ClaimOptions,
  ClaimReference,
} from './ingestion.types.js'

// The worker's calls take the service-role client; `requeueDocuments` and `documentExists` take
// the caller's RLS client.
@Injectable()
export class IngestionRepository {
  async claimPending(db: DatabaseClient, options: ClaimOptions): Promise<ClaimedDocument[]> {
    const { data, error, status } = await db.rpc(DATABASE_FUNCTIONS.claimPendingDocuments, {
      p_batch_size: options.batchSize,
      p_stale_after_minutes: options.staleAfterMinutes,
      p_max_attempts: options.maxAttempts,
    })
    if (error) throw new DatabaseRequestError(error, status)
    return data.map(toClaimedDocument)
  }

  async existingChunkHashes(
    db: DatabaseClient,
    documentId: string,
    signature: string
  ): Promise<Set<string>> {
    // At most MAX_CHUNKS_PER_DOCUMENT rows once finalized; a cut-off answer only costs re-embedding.
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.documentChunks)
      .select('content_hash')
      .eq('document_id', documentId)
      .eq('embedding_model', signature)
    if (error) throw new DatabaseRequestError(error, status)
    return new Set(data.map((row) => row.content_hash))
  }

  async upsertChunks(
    db: DatabaseClient,
    documentId: string,
    contentHash: string,
    signature: string,
    chunks: readonly ChunkUpsert[]
  ): Promise<boolean> {
    const { data, error, status } = await db.rpc(DATABASE_FUNCTIONS.upsertDocumentChunks, {
      p_document_id: documentId,
      p_content_hash: contentHash,
      p_embedding_model: signature,
      p_chunks: chunks.map(toChunkPayload),
    })
    if (error) throw new DatabaseRequestError(error, status)
    return data !== STALE_CONTENT_RESULT
  }

  async finalize(
    db: DatabaseClient,
    documentId: string,
    contentHash: string,
    signature: string,
    chunkHashes: readonly string[]
  ): Promise<number | null> {
    const { data, error, status } = await db.rpc(DATABASE_FUNCTIONS.finalizeDocumentIngestion, {
      p_document_id: documentId,
      p_content_hash: contentHash,
      p_embedding_model: signature,
      p_chunk_hashes: [...chunkHashes],
    })
    if (error) throw new DatabaseRequestError(error, status)
    return data === STALE_CONTENT_RESULT ? null : data
  }

  async markFailed(
    db: DatabaseClient,
    claim: ClaimReference,
    message: string,
    retryInSeconds: number | null
  ): Promise<void> {
    const { error, status } = await db.rpc(DATABASE_FUNCTIONS.markDocumentIngestionFailed, {
      p_document_id: claim.id,
      p_content_hash: claim.contentHash,
      p_attempt: claim.attempt,
      p_error: message,
      ...(retryInSeconds === null ? {} : { p_retry_in_seconds: retryInSeconds }),
    })
    if (error) throw new DatabaseRequestError(error, status)
  }

  async requeueForModel(db: DatabaseClient, signature: string): Promise<number> {
    const { data, error, status } = await db.rpc(DATABASE_FUNCTIONS.requeueDocumentsForModel, {
      p_embedding_model: signature,
    })
    if (error) throw new DatabaseRequestError(error, status)
    return data
  }

  /** The definer function checks ownership itself. */
  async requeueDocuments(db: DatabaseClient, documentId?: string): Promise<number> {
    const { data, error, status } = await db.rpc(
      DATABASE_FUNCTIONS.requeueDocuments,
      documentId === undefined ? {} : { p_document_id: documentId }
    )
    if (error) throw new DatabaseRequestError(error, status)
    return data
  }

  async documentExists(db: DatabaseClient, documentId: string): Promise<boolean> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.documents)
      .select('id')
      .eq('id', documentId)
      .maybeSingle()
    if (error) throw new DatabaseRequestError(error, status)
    return data !== null
  }
}
