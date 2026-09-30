import type { EmbeddingModel } from '@kb/ai'
import { Inject, Injectable, Logger } from '@nestjs/common'

import { EMBEDDING_MODEL } from '../../ai/ai.constants.js'
import { TokenCounter } from '../../ai/token-counter.js'
import type { TokenCounting } from '../../ai/token-counter.types.js'
import { describeError } from '../../common/errors/describe-error.js'
import { chunkArray } from '../../common/utils/chunk-array.js'
import { toStoredVector } from '../../common/utils/vector.js'
import type { AiSetup, AppConfig } from '../../config/app-config.types.js'
import { APP_CONFIG } from '../../config/config.constants.js'
import { SupabaseClientFactory } from '../../database/supabase-client.factory.js'
import { estimateEmbeddingUsage, meterUsage } from '../usage/usage-estimate.js'
import { UsageRecorder } from '../usage/usage-recorder.js'
import { chunkDocument } from './chunking/chunker.js'
import { MAX_CHUNKS_PER_DOCUMENT } from './chunking/chunker.constants.js'
import type { DocumentChunk } from './chunking/chunker.types.js'
import { nextRetryInSeconds } from './ingestion.backoff.js'
import { CHUNK_UPSERT_BATCH_SIZE, INGESTION_MESSAGES } from './ingestion.constants.js'
import { classifyIngestionFailure } from './ingestion-failure.js'
import { toChunkUpsert } from './ingestion.mapper.js'
import { IngestionRepository } from './ingestion.repository.js'
import type {
  ChunkUpsert,
  ClaimedDocument,
  IndexingRun,
  IngestionFailure,
  IngestionOutcome,
} from './ingestion.types.js'

const STALE: IngestionOutcome = { status: 'stale' }
// The worker stays idle without AI; the stand-in embedding model would reject any batch anyway.
const IDLE_EMBEDDING_BATCH_SIZE = 1

/** Indexes one claimed document: chunk, embed what is new, store, then publish atomically. */
@Injectable()
export class IngestionService {
  readonly #logger = new Logger(IngestionService.name)
  readonly #embeddingBatchSize: number
  readonly #maxAttempts: number

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(EMBEDDING_MODEL) private readonly embedding: EmbeddingModel,
    @Inject(TokenCounter) private readonly counter: TokenCounting,
    private readonly clients: SupabaseClientFactory,
    private readonly repository: IngestionRepository,
    private readonly usage: UsageRecorder
  ) {
    this.#embeddingBatchSize = embeddingBatchSize(config.ai)
    this.#maxAttempts = config.ingestion.maxAttempts
  }

  /** Never throws: a failure is recorded on the document, with a retry when one may help. */
  async process(document: ClaimedDocument): Promise<IngestionOutcome> {
    // Only a stale claim gets past the limit: every earlier run died midway, so this one would too.
    if (document.attempt > this.#maxAttempts) {
      const message = INGESTION_MESSAGES.attemptsExhausted(this.#maxAttempts)
      return this.#fail(document, { message, retryable: false, expected: true })
    }
    try {
      const chunks = chunkDocument(document, this.counter)
      if (chunks.length > MAX_CHUNKS_PER_DOCUMENT) {
        const message = INGESTION_MESSAGES.tooManyChunks(chunks.length)
        return await this.#fail(document, { message, retryable: false, expected: true })
      }
      const run = { db: this.clients.serviceRole(), document, signature: this.embedding.signature }
      return await this.#index(run, chunks)
    } catch (error) {
      return this.#fail(document, classifyIngestionFailure(error), error)
    }
  }

  async #index(run: IndexingRun, chunks: readonly DocumentChunk[]): Promise<IngestionOutcome> {
    const { db, document, signature } = run
    const { id, contentHash, attempt } = document
    // Every attempt reuses what is stored, so a run cut short (by a rate limit, say) resumes.
    const stored = await this.repository.existingChunkHashes(db, id, signature)
    const missing = chunks.filter((chunk) => !stored.has(chunk.contentHash))
    const reused = chunks.filter((chunk) => stored.has(chunk.contentHash))
    for (const batch of chunkArray(missing, this.#embeddingBatchSize)) {
      const vectors = await this.#embed(document, batch)
      const rows = batch.map((chunk, index) => toChunkUpsert(chunk, toStoredVector(vectors[index])))
      if (!(await this.#store(run, rows))) return this.#stale(run)
    }
    const kept = reused.map((chunk) => toChunkUpsert(chunk, null))
    if (!(await this.#store(run, kept))) return this.#stale(run)
    const hashes = chunks.map((chunk) => chunk.contentHash)
    const chunkCount = await this.repository.finalize(db, id, contentHash, signature, hashes)
    if (chunkCount === null) return this.#stale(run)
    this.#logger.log(
      `Indexed document ${id} (attempt ${attempt}): ${chunkCount} chunks, ` +
        `${missing.length} embedded, ${reused.length} reused [${signature}]`
    )
    return { status: 'ready', chunkCount, embedded: missing.length, reused: reused.length }
  }

  async #embed(document: ClaimedDocument, chunks: readonly DocumentChunk[]): Promise<number[][]> {
    const texts = chunks.map((chunk) => chunk.embeddingInput)
    const startedAt = performance.now()
    const result = await this.embedding.embed({ texts })
    this.usage.record({
      userId: document.userId,
      kind: 'embedding',
      provider: this.embedding.provider,
      model: result.model,
      usage: meterUsage(result.usage, () => estimateEmbeddingUsage(texts, this.counter)),
      latencyMs: Math.round(performance.now() - startedAt),
      documentId: document.id,
    })
    return result.embeddings
  }

  /** False once the content changed since the claim. */
  async #store(
    { db, document, signature }: IndexingRun,
    rows: readonly ChunkUpsert[]
  ): Promise<boolean> {
    for (const batch of chunkArray(rows, CHUNK_UPSERT_BATCH_SIZE)) {
      const { id, contentHash } = document
      if (!(await this.repository.upsertChunks(db, id, contentHash, signature, batch))) return false
    }
    return true
  }

  // An edit (re-queued by the documents trigger), a deletion or a newer claim superseded the run.
  #stale({ document }: IndexingRun): IngestionOutcome {
    this.#logger.log(
      `Document ${document.id} changed, was deleted or was claimed again while it was indexed; ` +
        'this run is dropped'
    )
    return STALE
  }

  async #fail(
    document: ClaimedDocument,
    failure: IngestionFailure,
    cause?: unknown
  ): Promise<IngestionOutcome> {
    const retryInSeconds = nextRetryInSeconds(failure, document.attempt, this.#maxAttempts)
    const retry = retryInSeconds === null ? 'no automatic retry' : `retry in ${retryInSeconds}s`
    const detail = cause === undefined ? failure.message : describeError(cause)
    const line = `Indexing document ${document.id} failed on attempt ${document.attempt} (${retry})`
    if (failure.expected) this.#logger.warn(`${line}: ${detail}`)
    else this.#logger.error(`${line}: ${detail}`, cause instanceof Error ? cause.stack : undefined)
    try {
      const db = this.clients.serviceRole()
      await this.repository.markFailed(db, document, failure.message, retryInSeconds)
    } catch (error) {
      // The claim then goes stale and is taken again after INGESTION_STALE_AFTER_MINUTES.
      this.#logger.error(`Could not record the failure of ${document.id}: ${describeError(error)}`)
    }
    return { status: 'failed', message: failure.message, retryInSeconds }
  }
}

function embeddingBatchSize(ai: AiSetup): number {
  return ai.configured ? ai.config.embedding.batchSize : IDLE_EMBEDDING_BATCH_SIZE
}
