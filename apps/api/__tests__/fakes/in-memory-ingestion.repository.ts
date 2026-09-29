import { PostgrestError } from '@supabase/supabase-js'

import type { DatabaseClient } from '../../src/database/database-client.types.js'
import { DatabaseRequestError } from '../../src/database/database-error.js'
import type { IngestionRepository } from '../../src/modules/ingestion/ingestion.repository.js'
import type {
  ChunkUpsert,
  ClaimedDocument,
  ClaimOptions,
} from '../../src/modules/ingestion/ingestion.types.js'

type IngestionStore = Pick<IngestionRepository, keyof IngestionRepository>

interface StoredChunk {
  readonly contentHash: string
  readonly documentContentHash: string
  readonly embedding: string
  readonly model: string
}

export interface RecordedFailure {
  readonly documentId: string
  readonly message: string
  readonly retryInSeconds: number | null
}

const NOT_NULL_VIOLATION = {
  message: 'null value in column "embedding" violates not-null constraint',
  details: '',
  hint: '',
  code: '23502',
}
const BAD_REQUEST_STATUS = 400

/** The ingestion SQL functions over maps, with their stale-content and vector-reuse rules. */
export class InMemoryIngestionRepository implements IngestionStore {
  /** Current `content_hash` per document; a different one makes a run stale. */
  readonly contentHashes = new Map<string, string>()
  readonly chunks = new Map<string, StoredChunk[]>()
  readonly upserts: ChunkUpsert[][] = []
  readonly failures: RecordedFailure[] = []
  readonly finalized: string[] = []
  claims: ClaimedDocument[][] = []

  async claimPending(_db: DatabaseClient, _options: ClaimOptions): Promise<ClaimedDocument[]> {
    return this.claims.shift() ?? []
  }

  async existingChunkHashes(
    _db: DatabaseClient,
    documentId: string,
    signature: string
  ): Promise<Set<string>> {
    const stored = this.chunks.get(documentId) ?? []
    return new Set(stored.filter((chunk) => chunk.model === signature).map((c) => c.contentHash))
  }

  async upsertChunks(
    _db: DatabaseClient,
    documentId: string,
    contentHash: string,
    signature: string,
    rows: readonly ChunkUpsert[]
  ): Promise<boolean> {
    if (this.contentHashes.get(documentId) !== contentHash) return false
    this.upserts.push([...rows])
    const stored = this.chunks.get(documentId) ?? []
    const updated = rows.map((row): StoredChunk => {
      const reused = stored.find((c) => c.contentHash === row.contentHash && c.model === signature)
      const embedding = row.embedding ?? reused?.embedding
      if (embedding === undefined) {
        throw new DatabaseRequestError(new PostgrestError(NOT_NULL_VIOLATION), BAD_REQUEST_STATUS)
      }
      return {
        contentHash: row.contentHash,
        documentContentHash: contentHash,
        embedding,
        model: signature,
      }
    })
    const replaced = new Set(updated.map((chunk) => chunk.contentHash))
    this.chunks.set(documentId, [...stored.filter((c) => !replaced.has(c.contentHash)), ...updated])
    return true
  }

  async finalize(
    _db: DatabaseClient,
    documentId: string,
    contentHash: string,
    signature: string
  ): Promise<number | null> {
    if (this.contentHashes.get(documentId) !== contentHash) return null
    const current = (this.chunks.get(documentId) ?? []).filter(
      (chunk) => chunk.documentContentHash === contentHash && chunk.model === signature
    )
    this.chunks.set(documentId, current)
    this.finalized.push(documentId)
    return current.length
  }

  async markFailed(
    _db: DatabaseClient,
    documentId: string,
    message: string,
    retryInSeconds: number | null
  ): Promise<void> {
    this.failures.push({ documentId, message, retryInSeconds })
  }

  async requeueForModel(_db: DatabaseClient, _signature: string): Promise<number> {
    return 0
  }

  async requeueDocuments(_db: DatabaseClient, documentId?: string): Promise<number> {
    if (documentId === undefined) return this.contentHashes.size
    return this.contentHashes.has(documentId) ? 1 : 0
  }

  async documentExists(_db: DatabaseClient, documentId: string): Promise<boolean> {
    return this.contentHashes.has(documentId)
  }
}
