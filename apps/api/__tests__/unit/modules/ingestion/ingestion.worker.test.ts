import { FakeEmbeddingModel } from '@kb/ai'
import { Logger } from '@nestjs/common'
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter'
import { SchedulerRegistry } from '@nestjs/schedule'
import { Test, type TestingModule } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AI_STATUS, EMBEDDING_MODEL } from '../../../../src/ai/ai.constants.js'
import type { AiStatus } from '../../../../src/ai/ai-status.types.js'
import { APP_CONFIG } from '../../../../src/config/config.constants.js'
import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import { SupabaseClientFactory } from '../../../../src/database/supabase-client.factory.js'
import { INGESTION_SWEEP_INTERVAL } from '../../../../src/modules/ingestion/ingestion.constants.js'
import { DOCUMENT_INGESTION_REQUESTED } from '../../../../src/modules/ingestion/ingestion.events.js'
import { IngestionRepository } from '../../../../src/modules/ingestion/ingestion.repository.js'
import { IngestionService } from '../../../../src/modules/ingestion/ingestion.service.js'
import type {
  ClaimedDocument,
  ClaimOptions,
  IngestionOutcome,
} from '../../../../src/modules/ingestion/ingestion.types.js'
import { IngestionWorker } from '../../../../src/modules/ingestion/ingestion.worker.js'
import { buildTestConfig, TEST_OPENAI_KEY, TEST_USER } from '../../../fixtures.js'

const SERVICE_DB = { role: 'service_role' } as unknown as DatabaseClient
const READY: IngestionOutcome = { status: 'ready', chunkCount: 1, embedded: 1, reused: 0 }
const UNCONFIGURED: AiStatus = {
  configured: false,
  problem: 'AI is not configured: AI_CHAT_API_KEY',
}

/** Holds one call open: `reached` resolves once the call waits, `release()` lets it go on. */
interface Gate {
  readonly reached: Promise<void>
  readonly release: () => void
  readonly wait: () => Promise<void>
}

function gate(): Gate {
  let reach = (): void => undefined
  let release = (): void => undefined
  const reached = new Promise<void>((resolve) => (reach = resolve))
  const released = new Promise<void>((resolve) => (release = resolve))
  const wait = (): Promise<void> => {
    reach()
    return released
  }
  return { reached, release, wait }
}

function document(id: string): ClaimedDocument {
  return { id, userId: TEST_USER.id, title: id, content: id, contentHash: id, attempt: 1 }
}

type HeldCall = 'requeue' | 'claim' | 'process'

/** Claims scripted batches (then nothing) and processes instantly unless a call is held. */
class ScriptedQueue {
  readonly batches: ClaimedDocument[][] = []
  readonly requeuedFor: string[] = []
  readonly claimed: ClaimOptions[] = []
  readonly processed: string[] = []
  requeueFailure: Error | undefined
  readonly #gates = new Map<HeldCall, Gate>()

  /** Holds the next call of `kind` open until the gate is released. */
  hold(kind: HeldCall): Gate {
    const held = gate()
    this.#gates.set(kind, held)
    return held
  }

  async requeueForModel(_db: DatabaseClient, signature: string): Promise<number> {
    await this.#pass('requeue')
    const failure = this.requeueFailure
    this.requeueFailure = undefined
    if (failure !== undefined) throw failure
    this.requeuedFor.push(signature)
    return 0
  }

  async claimPending(_db: DatabaseClient, options: ClaimOptions): Promise<ClaimedDocument[]> {
    this.claimed.push(options)
    await this.#pass('claim')
    return this.batches.shift() ?? []
  }

  async process(claimed: ClaimedDocument): Promise<IngestionOutcome> {
    this.processed.push(claimed.id)
    await this.#pass('process')
    return READY
  }

  async #pass(kind: HeldCall): Promise<void> {
    const held = this.#gates.get(kind)
    this.#gates.delete(kind)
    await held?.wait()
  }
}

let moduleRef: TestingModule | undefined

interface StartOptions {
  readonly env?: Record<string, string>
  readonly aiStatus?: AiStatus
  readonly batches?: ClaimedDocument[][]
}

/** Boots the worker and returns once its boot drain is over, so every test starts from there. */
async function start(options: StartOptions = {}) {
  const queue = new ScriptedQueue()
  queue.batches.push(...(options.batches ?? []))
  // Holding the boot drain keeps it from ending inside init(), which would make wake() start another.
  const boot = queue.hold('requeue')
  const scheduler = new SchedulerRegistry()
  const config = buildTestConfig({ AI_CHAT_API_KEY: TEST_OPENAI_KEY, ...options.env })
  moduleRef = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot()],
    providers: [
      IngestionWorker,
      { provide: APP_CONFIG, useValue: config },
      { provide: AI_STATUS, useValue: options.aiStatus ?? { configured: true } },
      { provide: EMBEDDING_MODEL, useValue: new FakeEmbeddingModel() },
      { provide: SchedulerRegistry, useValue: scheduler },
      { provide: SupabaseClientFactory, useValue: { serviceRole: () => SERVICE_DB } },
      { provide: IngestionRepository, useValue: queue },
      { provide: IngestionService, useValue: queue },
    ],
  }).compile()
  moduleRef.useLogger(false)
  // init() runs onModuleInit, which starts the boot drain, and attaches the event listeners.
  await moduleRef.init()
  const worker = moduleRef.get(IngestionWorker)
  const booted = worker.wake()
  boot.release()
  await booted
  return { worker, queue, scheduler, events: moduleRef.get(EventEmitter2) }
}

afterEach(async () => {
  await moduleRef?.close()
  moduleRef = undefined
})

describe('IngestionWorker', () => {
  it('drains on boot until a claim comes back empty, re-queuing other models once', async () => {
    const { queue } = await start({
      batches: [[document('a'), document('b')], [document('c')]],
    })

    expect(queue.processed).toEqual(['a', 'b', 'c'])
    expect(queue.claimed).toHaveLength(3)
    expect(queue.claimed[0]).toMatchObject({ batchSize: 5, staleAfterMinutes: 10, maxAttempts: 5 })
    expect(queue.requeuedFor).toEqual(['fake-embedding#8'])
  })

  it('coalesces wakes that arrive during a drain into one more pass', async () => {
    const { worker, queue } = await start()
    const held = queue.hold('claim')

    const drain = worker.wake()
    await held.reached
    void worker.wake()
    void worker.wake()
    void worker.wake()
    held.release()
    await drain

    expect(queue.claimed).toHaveLength(3)
    expect(queue.requeuedFor).toHaveLength(2)
  })

  it('wakes when a document asks for ingestion', async () => {
    const { worker, queue, events } = await start()

    events.emit(DOCUMENT_INGESTION_REQUESTED, { documentId: 'a', userId: TEST_USER.id })
    await worker.wake()

    expect(queue.claimed).toHaveLength(2)
  })

  it('sweeps on the configured interval until it is destroyed', async () => {
    const { worker, scheduler } = await start({ env: { INGESTION_SWEEP_INTERVAL_MS: '45000' } })

    expect(scheduler.getIntervals()).toEqual([INGESTION_SWEEP_INTERVAL])
    await worker.onModuleDestroy()
    expect(scheduler.getIntervals()).toEqual([])
  })

  it('does nothing while INGESTION_WORKER_ENABLED is false', async () => {
    const { worker, queue, scheduler } = await start({
      env: { INGESTION_WORKER_ENABLED: 'false' },
      batches: [[document('a')]],
    })

    await worker.wake()

    expect(scheduler.getIntervals()).toEqual([])
    expect(queue.claimed).toEqual([])
    expect(queue.requeuedFor).toEqual([])
  })

  it('stays idle without AI configuration and says so once', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn')
    const { worker, queue, scheduler } = await start({ aiStatus: UNCONFIGURED })

    await worker.wake()
    await worker.wake()

    expect(scheduler.getIntervals()).toEqual([])
    expect(queue.claimed).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(UNCONFIGURED.problem))
    warn.mockRestore()
  })

  it('survives a failed sweep and drains again on the next wake', async () => {
    const { worker, queue } = await start()
    queue.requeueFailure = new Error('database down')

    await worker.wake()
    await worker.wake()

    expect(queue.claimed).toHaveLength(2)
  })

  it('finishes the claimed batch when destroyed, then claims nothing more', async () => {
    const { worker, queue } = await start()
    const held = queue.hold('process')
    queue.batches.push([document('a'), document('b')], [document('c')])
    const claimsBefore = queue.claimed.length

    const drain = worker.wake()
    await held.reached
    const destroyed = worker.onModuleDestroy()
    held.release()
    await Promise.all([drain, destroyed])
    await worker.wake()

    expect(queue.processed).toEqual(['a', 'b'])
    expect(queue.claimed).toHaveLength(claimsBefore + 1)
  })
})
