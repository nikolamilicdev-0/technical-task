import {
  type AiErrorCode,
  AiProviderError,
  type EmbeddingRequest,
  type EmbeddingResult,
  FakeEmbeddingModel,
} from '@kb/ai'
import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { EMBEDDING_MODEL } from '../../../../src/ai/ai.constants.js'
import { TokenCounter } from '../../../../src/ai/token-counter.js'
import { chunkArray } from '../../../../src/common/utils/chunk-array.js'
import { APP_CONFIG } from '../../../../src/config/config.constants.js'
import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import { DatabaseRequestError } from '../../../../src/database/database-error.js'
import { SupabaseClientFactory } from '../../../../src/database/supabase-client.factory.js'
import { chunkDocument } from '../../../../src/modules/ingestion/chunking/chunker.js'
import { DEFAULT_CHUNKING_OPTIONS } from '../../../../src/modules/ingestion/chunking/chunker.constants.js'
import { INGESTION_MESSAGES } from '../../../../src/modules/ingestion/ingestion.constants.js'
import { IngestionRepository } from '../../../../src/modules/ingestion/ingestion.repository.js'
import { IngestionService } from '../../../../src/modules/ingestion/ingestion.service.js'
import type { ClaimedDocument } from '../../../../src/modules/ingestion/ingestion.types.js'
import { UsageRecorder } from '../../../../src/modules/usage/usage-recorder.js'
import type { UsageEvent } from '../../../../src/modules/usage/usage.types.js'
import { InMemoryIngestionRepository } from '../../../fakes/in-memory-ingestion.repository.js'
import { buildTestConfig, TEST_OPENAI_KEY, TEST_USER } from '../../../fixtures.js'
import { TEST_DOCUMENT_ID } from '../../../fixtures/documents.js'
import { buildHandbook, paragraph } from '../../../fixtures/markdown.js'

const counter = new TokenCounter()
const SERVICE_DB = { role: 'service_role' } as unknown as DatabaseClient
const BATCH_SIZE = 4
const MAX_ATTEMPTS = 3
const VERSION = 'content-hash-v1'
const EDITED_VERSION = 'content-hash-v2'
const HANDBOOK = buildHandbook()

/** Leaves out the usage report, as Gemini's OpenAI-compatible embeddings endpoint does. */
class UnmeteredEmbeddingModel extends FakeEmbeddingModel {
  override async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const { usage: _usage, ...result } = await super.embed(request)
    return result
  }
}

/** Rejects its second call, like a provider quota that runs out halfway through a document. */
class QuotaLimitedEmbeddingModel extends FakeEmbeddingModel {
  #calls = 0

  override async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    this.#calls += 1
    if (this.#calls === 2) {
      throw new AiProviderError('rate_limited', 'Fake quota exceeded', { provider: 'fake' })
    }
    return super.embed(request)
  }
}

function claimed(overrides: Partial<ClaimedDocument> = {}): ClaimedDocument {
  return {
    id: TEST_DOCUMENT_ID,
    userId: TEST_USER.id,
    title: 'Team handbook',
    content: HANDBOOK,
    contentHash: VERSION,
    attempt: 1,
    ...overrides,
  }
}

async function setup(embedding: FakeEmbeddingModel = new FakeEmbeddingModel()) {
  const repository = new InMemoryIngestionRepository()
  repository.contentHashes.set(TEST_DOCUMENT_ID, VERSION)
  const events: UsageEvent[] = []
  const config = buildTestConfig({
    AI_CHAT_API_KEY: TEST_OPENAI_KEY,
    AI_EMBEDDING_BATCH_SIZE: String(BATCH_SIZE),
    INGESTION_MAX_ATTEMPTS: String(MAX_ATTEMPTS),
  })
  const moduleRef = await Test.createTestingModule({
    providers: [
      IngestionService,
      { provide: TokenCounter, useValue: counter },
      { provide: APP_CONFIG, useValue: config },
      { provide: EMBEDDING_MODEL, useValue: embedding },
      { provide: SupabaseClientFactory, useValue: { serviceRole: () => SERVICE_DB } },
      { provide: IngestionRepository, useValue: repository },
      { provide: UsageRecorder, useValue: { record: (event: UsageEvent) => events.push(event) } },
    ],
  }).compile()
  // compile() installs a logger that prints errors; these tests provoke them on purpose.
  moduleRef.useLogger(false)
  return { service: moduleRef.get(IngestionService), repository, events, embedding }
}

const embeddedTexts = (embedding: FakeEmbeddingModel, from = 0): string[] =>
  embedding.requests.slice(from).flatMap((request) => [...request.texts])

describe('IngestionService', () => {
  it('embeds every chunk in batches on a first run, stores them and publishes the document', async () => {
    const { service, repository, embedding } = await setup()
    const chunks = chunkDocument(claimed(), counter)

    const outcome = await service.process(claimed())

    expect(outcome).toEqual({
      status: 'ready',
      chunkCount: chunks.length,
      embedded: chunks.length,
      reused: 0,
    })
    expect(embedding.requests.map((request) => request.texts)).toEqual(
      chunkArray(
        chunks.map((chunk) => chunk.embeddingInput),
        BATCH_SIZE
      )
    )
    expect(repository.upserts.flat().map((row) => row.contentHash)).toEqual(
      chunks.map((chunk) => chunk.contentHash)
    )
    expect(repository.upserts.flat().every((row) => row.embedding?.startsWith('[') === true)).toBe(
      true
    )
    expect(repository.finalized).toEqual([TEST_DOCUMENT_ID])
    expect(repository.failures).toEqual([])
  })

  it('records one embedding usage event per provider call', async () => {
    const { service, events, embedding } = await setup()

    await service.process(claimed())

    expect(events).toHaveLength(embedding.requests.length)
    const [first] = events
    expect(first).toMatchObject({
      userId: TEST_USER.id,
      kind: 'embedding',
      provider: 'fake',
      model: 'fake-embedding',
      documentId: TEST_DOCUMENT_ID,
      usage: { completionTokens: 0, estimated: false },
    })
    expect(first?.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('estimates the usage, flagged, when the provider reports none', async () => {
    const { service, events, embedding } = await setup(new UnmeteredEmbeddingModel())

    await service.process(claimed())

    const texts = embedding.requests[0]?.texts ?? []
    const promptTokens = texts.reduce((total, text) => total + counter.count(text), 0)
    expect(events[0]?.usage).toEqual({
      promptTokens,
      completionTokens: 0,
      totalTokens: promptTokens,
      estimated: true,
    })
  })

  it('embeds only chunks with new hashes after an edit and reuses the stored vectors', async () => {
    const { service, repository, embedding } = await setup()
    await service.process(claimed())
    const edited = claimed({
      content: HANDBOOK.replace('handles case 3005 ', 'handles case 3009 '),
      contentHash: EDITED_VERSION,
    })
    repository.contentHashes.set(TEST_DOCUMENT_ID, EDITED_VERSION)
    const knownHashes = new Set(chunkDocument(claimed(), counter).map((chunk) => chunk.contentHash))
    const editedChunks = chunkDocument(edited, counter)
    const changed = editedChunks.filter((chunk) => !knownHashes.has(chunk.contentHash))
    const callsBefore = embedding.requests.length

    const outcome = await service.process(edited)

    expect(changed.length).toBeGreaterThan(0)
    expect(embeddedTexts(embedding, callsBefore)).toEqual(changed.map((c) => c.embeddingInput))
    expect(outcome).toEqual({
      status: 'ready',
      chunkCount: editedChunks.length,
      embedded: changed.length,
      reused: editedChunks.length - changed.length,
    })
    const nullRows = repository.upserts.flat().filter((row) => row.embedding === null)
    expect(nullRows).toHaveLength(editedChunks.length - changed.length)
  })

  it('publishes only the current chunk set after a retuned chunker split the text', async () => {
    const { service, repository, embedding } = await setup()
    const options = {
      ...DEFAULT_CHUNKING_OPTIONS,
      targetTokens: DEFAULT_CHUNKING_OPTIONS.targetTokens / 2,
    }
    const retuned = chunkDocument(claimed(), counter, options)
    repository.chunks.set(
      TEST_DOCUMENT_ID,
      retuned.map((chunk) => ({
        contentHash: chunk.contentHash,
        documentContentHash: VERSION,
        embedding: '[0]',
        model: embedding.signature,
      }))
    )
    const current = new Set(chunkDocument(claimed(), counter).map((chunk) => chunk.contentHash))

    const outcome = await service.process(claimed())

    expect(retuned.some((chunk) => !current.has(chunk.contentHash))).toBe(true)
    expect(outcome).toMatchObject({ status: 'ready', chunkCount: current.size })
    const stored = repository.chunks.get(TEST_DOCUMENT_ID) ?? []
    expect(new Set(stored.map((chunk) => chunk.contentHash))).toEqual(current)
  })

  it('resumes a retry from the vectors stored before a rate limit cut the run short', async () => {
    const { service, repository, embedding } = await setup(new QuotaLimitedEmbeddingModel())
    const chunks = chunkDocument(claimed(), counter)

    const first = await service.process(claimed())
    const firstBatch = embeddedTexts(embedding)
    const callsBefore = embedding.requests.length
    const second = await service.process(claimed({ attempt: 2 }))

    expect(first).toMatchObject({ status: 'failed', retryInSeconds: 30 })
    expect(second).toEqual({
      status: 'ready',
      chunkCount: chunks.length,
      embedded: chunks.length - BATCH_SIZE,
      reused: BATCH_SIZE,
    })
    expect(embeddedTexts(embedding, callsBefore).some((text) => firstBatch.includes(text))).toBe(
      false
    )
    expect(repository.finalized).toEqual([TEST_DOCUMENT_ID])
  })

  it('retries a run whose reused vector vanished, reading the stored hashes afresh', async () => {
    const { service, repository } = await setup()
    const hashes = chunkDocument(claimed(), counter).map((chunk) => chunk.contentHash)
    vi.spyOn(repository, 'existingChunkHashes').mockResolvedValueOnce(new Set(hashes))

    const first = await service.process(claimed())
    const second = await service.process(claimed({ attempt: 2 }))

    expect(first).toEqual({
      status: 'failed',
      message: INGESTION_MESSAGES.storedChunksChanged,
      retryInSeconds: 30,
    })
    expect(second).toMatchObject({ status: 'ready', embedded: hashes.length, reused: 0 })
  })

  it('stops without publishing or failing once the content changed during the run', async () => {
    const { service, repository, embedding } = await setup()
    repository.contentHashes.set(TEST_DOCUMENT_ID, EDITED_VERSION)

    const outcome = await service.process(claimed())

    expect(outcome).toEqual({ status: 'stale' })
    expect(embedding.requests).toHaveLength(1)
    expect(repository.finalized).toEqual([])
    expect(repository.failures).toEqual([])
  })

  it('schedules a retry with backoff after a transient provider error', async () => {
    const failure = new AiProviderError('rate_limited', 'Fake rate limit reached', {
      provider: 'fake',
    })
    const { service, repository } = await setup(new FakeEmbeddingModel({ failures: [failure] }))

    const outcome = await service.process(claimed({ attempt: 2 }))

    expect(outcome).toEqual({
      status: 'failed',
      message: 'Fake rate limit reached',
      retryInSeconds: 60,
    })
    expect(repository.failures).toEqual([
      {
        documentId: TEST_DOCUMENT_ID,
        attempt: 2,
        message: 'Fake rate limit reached',
        retryInSeconds: 60,
      },
    ])
  })

  it('schedules no retry once the last attempt failed', async () => {
    const failure = new AiProviderError('timeout', 'Fake timeout', { provider: 'fake' })
    const { service } = await setup(new FakeEmbeddingModel({ failures: [failure] }))

    const outcome = await service.process(claimed({ attempt: MAX_ATTEMPTS }))

    expect(outcome).toMatchObject({ status: 'failed', retryInSeconds: null })
  })

  it('fails for good without chunking once a stale claim runs past the last attempt', async () => {
    const { service, repository, embedding } = await setup()
    const count = vi.spyOn(counter, 'count')
    const message = INGESTION_MESSAGES.attemptsExhausted(MAX_ATTEMPTS)

    const outcome = await service.process(claimed({ attempt: MAX_ATTEMPTS + 1 }))

    expect(outcome).toEqual({ status: 'failed', message, retryInSeconds: null })
    expect(count).not.toHaveBeenCalled()
    expect(embedding.requests).toEqual([])
    expect(repository.failures).toEqual([
      { documentId: TEST_DOCUMENT_ID, attempt: MAX_ATTEMPTS + 1, message, retryInSeconds: null },
    ])
    count.mockRestore()
  })

  it('records a failure against its own claim, leaving an edited version alone', async () => {
    const failure = new AiProviderError('server', 'Fake outage', { provider: 'fake' })
    const { service, repository } = await setup(new FakeEmbeddingModel({ failures: [failure] }))
    repository.contentHashes.set(TEST_DOCUMENT_ID, EDITED_VERSION)

    const outcome = await service.process(claimed())

    expect(outcome).toMatchObject({ status: 'failed', message: 'Fake outage' })
    expect(repository.failures).toEqual([])
  })

  it.each<AiErrorCode>(['authentication', 'invalid_request', 'unsupported'])(
    'fails for good after a %s provider error',
    async (code) => {
      const failure = new AiProviderError(code, `Fake ${code}`, { provider: 'fake' })
      const { service, repository } = await setup(new FakeEmbeddingModel({ failures: [failure] }))

      await service.process(claimed())

      expect(repository.failures).toEqual([
        { documentId: TEST_DOCUMENT_ID, attempt: 1, message: `Fake ${code}`, retryInSeconds: null },
      ])
    }
  )

  it('fails for good, without embedding anything, when the document has too many chunks', async () => {
    const { service, repository, embedding } = await setup()
    const glossary = Array.from(
      { length: 1_001 },
      (_, index) => `## Term ${index}\n\nMeaning ${index}.`
    )

    const outcome = await service.process(claimed({ content: glossary.join('\n\n') }))

    expect(outcome).toEqual({
      status: 'failed',
      message: INGESTION_MESSAGES.tooManyChunks(1_001),
      retryInSeconds: null,
    })
    expect(embedding.requests).toEqual([])
    expect(repository.failures).toHaveLength(1)
  })

  it('fails for good when the vectors are larger than the column', async () => {
    const { service } = await setup(new FakeEmbeddingModel({ dimensions: 2_000 }))

    const outcome = await service.process(claimed())

    expect(outcome).toMatchObject({ status: 'failed', retryInSeconds: null })
    expect(outcome.status === 'failed' && outcome.message).toContain('2000 dimensions')
  })

  it.each([
    ['retries after a database outage', 503, INGESTION_MESSAGES.databaseUnavailable, 30],
    ['fails for good after a rejected write', 400, INGESTION_MESSAGES.databaseRejected, null],
  ])('%s', async (_, status, message, retryInSeconds) => {
    const { service, repository } = await setup()
    const error = new PostgrestError({ message: 'boom', details: '', hint: '', code: '' })
    vi.spyOn(repository, 'upsertChunks').mockRejectedValueOnce(
      new DatabaseRequestError(error, status)
    )

    await service.process(claimed())

    expect(repository.failures).toEqual([
      { documentId: TEST_DOCUMENT_ID, attempt: 1, message, retryInSeconds },
    ])
  })

  it('logs an unexpected error with its stack and stores only a generic message', async () => {
    const { service, repository } = await setup()
    const error = vi.spyOn(Logger.prototype, 'error')
    vi.spyOn(repository, 'existingChunkHashes').mockRejectedValueOnce(new TypeError('boom'))

    const outcome = await service.process(claimed())

    expect(outcome).toMatchObject({ status: 'failed', message: INGESTION_MESSAGES.unexpected })
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('boom'),
      expect.stringContaining('TypeError')
    )
    error.mockRestore()
  })

  it('never throws, even when the failure cannot be recorded', async () => {
    const failure = new AiProviderError('server', 'Fake outage', { provider: 'fake' })
    const { service, repository } = await setup(new FakeEmbeddingModel({ failures: [failure] }))
    vi.spyOn(repository, 'markFailed').mockRejectedValueOnce(new Error('database down'))

    await expect(service.process(claimed())).resolves.toMatchObject({ status: 'failed' })
  })

  it('never sends a chunk hash twice in one batch, even for a repeated passage', async () => {
    const { service, repository } = await setup()
    const answer = paragraph(1, 20)
    const faq = ['## FAQ', answer, '## FAQ', answer, '## Other', paragraph(100, 30)].join('\n\n')

    const outcome = await service.process(claimed({ content: faq }))

    expect(outcome).toMatchObject({ status: 'ready' })
    const hashes = repository.upserts.flat().map((row) => row.contentHash)
    expect(new Set(hashes).size).toBe(hashes.length)
  })

  it('publishes a blank document with no chunks without calling the provider', async () => {
    const { service, repository, embedding } = await setup()

    const outcome = await service.process(claimed({ content: ' \n\n ' }))

    expect(outcome).toEqual({ status: 'ready', chunkCount: 0, embedded: 0, reused: 0 })
    expect(embedding.requests).toEqual([])
    expect(repository.finalized).toEqual([TEST_DOCUMENT_ID])
  })
})
