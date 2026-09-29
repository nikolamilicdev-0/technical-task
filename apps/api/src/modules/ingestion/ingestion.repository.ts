import { Injectable } from '@nestjs/common'

import type { DatabaseClient } from '../../database/database-client.types.js'
import { DATABASE_FUNCTIONS, DATABASE_RELATIONS } from '../../database/database.constants.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import { STALE_CONTENT_RESULT } from './ingestion.constants.js'
import { toChunkPayload, toClaimedDocument } from './ingestion.mapper.js'
import type { ChunkUpsert, ClaimedDocument, ClaimOptions } from './ingestion.types.js'

/**
 * The ingestion SQL functions (DEC-005). The worker passes the service-role client and scopes
 * every call by document id; the requeue and existence calls take the caller's RLS client.
 */
@Injectable()
export class IngestionRepository {
  /** Claims queued, due-for-retry and stale documents (`FOR UPDATE SKIP LOCKED`). */
  async claimPending(db: DatabaseClient, options: ClaimOptions): Promise<ClaimedDocument[]> {
    const { data, error, status } = await db.rpc(DATABASE_FUNCTIONS.claimPendingDocuments, {
      p_batch_size: options.batchSize,
      p_stale_after_minutes: options.staleAfterMinutes,
      p_max_attempts: options.maxAttempts,
    })
    if (error) throw new DatabaseRequestError(error, status)
    return data.map(toClaimedDocument)
  }

  /** Content hashes of the document's stored chunks under the model signature. */
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

  /** Upserts chunks by content hash; false once the content changed since the claim. */
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

  /** Drops chunks of older versions and marks the document ready; null once the content changed. */
  async finalize(
    db: DatabaseClient,
    documentId: string,
    contentHash: string,
    signature: string
  ): Promise<number | null> {
    const { data, error, status } = await db.rpc(DATABASE_FUNCTIONS.finalizeDocumentIngestion, {
      p_document_id: documentId,
      p_content_hash: contentHash,
      p_embedding_model: signature,
    })
    if (error) throw new DatabaseRequestError(error, status)
    return data === STALE_CONTENT_RESULT ? null : data
  }

  /** Records a failed run; without `retryInSeconds` no automatic retry is scheduled. */
  async markFailed(
    db: DatabaseClient,
    documentId: string,
    message: string,
    retryInSeconds: number | null
  ): Promise<void> {
    const { error, status } = await db.rpc(DATABASE_FUNCTIONS.markDocumentIngestionFailed, {
      p_document_id: documentId,
      p_error: message,
      ...(retryInSeconds === null ? {} : { p_retry_in_seconds: retryInSeconds }),
    })
    if (error) throw new DatabaseRequestError(error, status)
  }

  /** Re-queues ready documents embedded under another model signature (DEC-014). */
  async requeueForModel(db: DatabaseClient, signature: string): Promise<number> {
    const { data, error, status } = await db.rpc(DATABASE_FUNCTIONS.requeueDocumentsForModel, {
      p_embedding_model: signature,
    })
    if (error) throw new DatabaseRequestError(error, status)
    return data
  }

  /** Re-queues the caller's documents, one or all; the definer function checks ownership. */
  async requeueDocuments(db: DatabaseClient, documentId?: string): Promise<number> {
    const { data, error, status } = await db.rpc(
      DATABASE_FUNCTIONS.requeueDocuments,
      documentId === undefined ? {} : { p_document_id: documentId }
    )
    if (error) throw new DatabaseRequestError(error, status)
    return data
  }

  /** Whether RLS lets the caller see the document. */
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
