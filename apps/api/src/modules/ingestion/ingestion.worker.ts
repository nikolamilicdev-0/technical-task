import type { EmbeddingModel } from '@kb/ai'
import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { SchedulerRegistry } from '@nestjs/schedule'

import { AI_STATUS, EMBEDDING_MODEL } from '../../ai/ai.constants.js'
import type { AiStatus } from '../../ai/ai-status.types.js'
import { describeError } from '../../common/errors/describe-error.js'
import type { AppConfig, IngestionSettings } from '../../config/app-config.types.js'
import { APP_CONFIG } from '../../config/config.constants.js'
import type { DatabaseClient } from '../../database/database-client.types.js'
import { SupabaseClientFactory } from '../../database/supabase-client.factory.js'
import { INGESTION_SWEEP_INTERVAL } from './ingestion.constants.js'
import { DOCUMENT_INGESTION_REQUESTED } from './ingestion.events.js'
import { IngestionRepository } from './ingestion.repository.js'
import { IngestionService } from './ingestion.service.js'

/**
 * Drains the Postgres-backed queue (DEC-005): on boot, on every ingestion request and on a sweep
 * that also catches retries and stale claims. Wakes during a drain coalesce into one more pass.
 */
@Injectable()
export class IngestionWorker implements OnModuleInit, OnModuleDestroy {
  readonly #logger = new Logger(IngestionWorker.name)
  readonly #settings: IngestionSettings
  #running = false
  #draining = false
  #wakeRequested = false
  #requeuedOtherModels = false
  #drain: Promise<void> = Promise.resolve()

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(AI_STATUS) private readonly aiStatus: AiStatus,
    @Inject(EMBEDDING_MODEL) private readonly embedding: EmbeddingModel,
    private readonly scheduler: SchedulerRegistry,
    private readonly clients: SupabaseClientFactory,
    private readonly repository: IngestionRepository,
    private readonly ingestion: IngestionService
  ) {
    this.#settings = config.ingestion
  }

  onModuleInit(): void {
    if (!this.#settings.workerEnabled) {
      this.#logger.log('Ingestion worker disabled (INGESTION_WORKER_ENABLED=false)')
      return
    }
    if (!this.aiStatus.configured) {
      this.#logger.warn(`Ingestion worker idle: ${this.aiStatus.problem}`)
      return
    }
    this.#running = true
    const sweep = setInterval(() => void this.wake(), this.#settings.sweepIntervalMs)
    this.scheduler.addInterval(INGESTION_SWEEP_INTERVAL, sweep)
    const every = `${this.#settings.sweepIntervalMs} ms`
    this.#logger.log(
      `Ingestion worker started with ${this.embedding.signature}, sweep every ${every}`
    )
    void this.wake()
  }

  /** Stops claiming; resolves once the document being processed is done. */
  async onModuleDestroy(): Promise<void> {
    this.#running = false
    if (this.scheduler.doesExist('interval', INGESTION_SWEEP_INTERVAL)) {
      this.scheduler.deleteInterval(INGESTION_SWEEP_INTERVAL)
    }
    await this.#drain
  }

  @OnEvent(DOCUMENT_INGESTION_REQUESTED)
  onIngestionRequested(): void {
    void this.wake()
  }

  /** Starts a drain, or asks the running one for another pass; resolves when it has finished. */
  wake(): Promise<void> {
    if (!this.#running) return this.#drain
    this.#wakeRequested = true
    if (!this.#draining) {
      this.#draining = true
      this.#drain = this.#drainQueue()
    }
    return this.#drain
  }

  async #drainQueue(): Promise<void> {
    try {
      const db = this.clients.serviceRole()
      await this.#requeueOtherModels(db)
      while (this.#running && this.#wakeRequested) {
        this.#wakeRequested = false
        // A full batch may have left more behind, so a claim that found rows asks for a pass too.
        if ((await this.#processBatch(db)) > 0) this.#wakeRequested = true
      }
    } catch (error) {
      this.#logger.error(`Ingestion sweep failed: ${describeError(error)}`)
    } finally {
      this.#draining = false
    }
  }

  // Once per process, as the signature is fixed at boot; a failure is retried by the next drain and
  // never holds up the claims.
  async #requeueOtherModels(db: DatabaseClient): Promise<void> {
    if (this.#requeuedOtherModels) return
    const { signature } = this.embedding
    try {
      const requeued = await this.repository.requeueForModel(db, signature)
      this.#requeuedOtherModels = true
      if (requeued > 0) {
        this.#logger.log(
          `Re-queued documents embedded under another model than ${signature}: ${requeued}`
        )
      }
    } catch (error) {
      this.#logger.warn(`Could not re-queue documents of other models: ${describeError(error)}`)
    }
  }

  // On shutdown the rest of the batch keeps its claim, which goes stale and is claimed again.
  async #processBatch(db: DatabaseClient): Promise<number> {
    const documents = await this.repository.claimPending(db, this.#settings)
    for (const document of documents) {
      if (!this.#running) break
      await this.ingestion.process(document)
    }
    return documents.length
  }
}
