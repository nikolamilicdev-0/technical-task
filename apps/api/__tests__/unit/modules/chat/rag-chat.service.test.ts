import { AiProviderError, FakeChatModel, type FakeChatReply, FakeEmbeddingModel } from '@kb/ai'
import type { ChatSseEvent, Conversation, SendMessageInput } from '@kb/contracts'
import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'

import { CHAT_MODEL, EMBEDDING_MODEL } from '../../../../src/ai/ai.constants.js'
import { TokenCounter } from '../../../../src/ai/token-counter.js'
import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import { APP_CONFIG } from '../../../../src/config/config.constants.js'
import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import type { UserContext } from '../../../../src/database/user-context.types.js'
import type { AnswerMetadata, ChatEventStream } from '../../../../src/modules/chat/chat.types.js'
import { ConversationsRepository } from '../../../../src/modules/chat/conversations.repository.js'
import { MessagesRepository } from '../../../../src/modules/chat/messages.repository.js'
import { PromptBuilder } from '../../../../src/modules/chat/prompt-builder.js'
import { NO_SOURCES_NOTICE } from '../../../../src/modules/chat/prompt.constants.js'
import { QueryRewriter } from '../../../../src/modules/chat/query-rewriter.js'
import { RagChatService } from '../../../../src/modules/chat/rag-chat.service.js'
import { RetrievalRepository } from '../../../../src/modules/retrieval/retrieval.repository.js'
import { RetrievalService } from '../../../../src/modules/retrieval/retrieval.service.js'
import { UsageRecorder } from '../../../../src/modules/usage/usage-recorder.js'
import type { UsageEvent } from '../../../../src/modules/usage/usage.types.js'
import { inMemoryChat } from '../../../fakes/in-memory-chat.repositories.js'
import { ScriptedRetrievalRepository } from '../../../fakes/scripted-retrieval.repository.js'
import { buildTestConfig, TEST_USER } from '../../../fixtures.js'
import { buildCandidate, TEST_CONVERSATION_ID } from '../../../fixtures/chat.js'
import { TEST_DOCUMENT_ID } from '../../../fixtures/documents.js'

const USER: UserContext = { userId: TEST_USER.id, db: {} as DatabaseClient }
const counter = new TokenCounter()
const QUESTION: SendMessageInput = {
  content: 'What does the Pro plan cost?\nAnd is there a trial?',
}
const ANSWER = 'The Pro plan costs 20 euros a month [1]. Refunds take a week [3][9].'
const REPORTED_USAGE = { promptTokens: 700, completionTokens: 20, totalTokens: 720 }
const PROVIDER_DOWN = new AiProviderError('server', 'Upstream overloaded', { provider: 'fake' })

interface SetupOptions {
  readonly replies?: (string | FakeChatReply)[]
  readonly embedding?: FakeEmbeddingModel
  readonly env?: Record<string, string>
}

async function setup({ replies = [ANSWER], embedding, env = {} }: SetupOptions = {}) {
  const store = inMemoryChat()
  const retrieval = new ScriptedRetrievalRepository()
  retrieval.vectorHits = ['plans', 'trial', 'refunds'].map((key, index) =>
    buildCandidate(key, { similarity: 0.9 - index / 10, chunkIndex: index })
  )
  const usage: UsageEvent[] = []
  const chat = new FakeChatModel({ replies, chunkSize: 6 })
  const embedder = embedding ?? new FakeEmbeddingModel({ dimensions: 8 })
  const moduleRef = await Test.createTestingModule({
    providers: [
      RagChatService,
      RetrievalService,
      QueryRewriter,
      PromptBuilder,
      { provide: APP_CONFIG, useValue: buildTestConfig(env) },
      { provide: CHAT_MODEL, useValue: chat },
      { provide: EMBEDDING_MODEL, useValue: embedder },
      { provide: TokenCounter, useValue: counter },
      { provide: ConversationsRepository, useValue: store.conversations },
      { provide: MessagesRepository, useValue: store.messages },
      { provide: RetrievalRepository, useValue: retrieval },
      { provide: UsageRecorder, useValue: { record: (event: UsageEvent) => usage.push(event) } },
    ],
  }).compile()
  // compile() installs a logger that prints errors; several tests provoke them on purpose.
  moduleRef.useLogger(false)
  const conversation = await store.conversations.insert(USER.db, {})
  return {
    service: moduleRef.get(RagChatService),
    store,
    retrieval,
    chat,
    embedder,
    usage,
    conversation,
  }
}

async function drain(stream: ChatEventStream, onEvent: (event: ChatSseEvent) => void = () => {}) {
  const events: ChatSseEvent[] = []
  let step = await stream.next()
  while (step.done !== true) {
    events.push(step.value)
    onEvent(step.value)
    step = await stream.next()
  }
  return { events, outcome: step.value }
}

async function send(
  service: RagChatService,
  conversation: Conversation,
  input: SendMessageInput = QUESTION,
  signal = new AbortController().signal
) {
  const run = await service.prepare(USER, conversation.id, input)
  return drain(run.events(signal))
}

const typesOf = (events: readonly ChatSseEvent[]) => [...new Set(events.map(({ type }) => type))]

describe('RagChatService', () => {
  it('streams meta, sources, deltas, usage, then done, and stores both messages', async () => {
    const { service, store, conversation } = await setup()

    const { events, outcome } = await send(service, conversation)

    expect(typesOf(events)).toEqual(['meta', 'sources', 'delta', 'usage', 'done'])
    const [question, answer] = store.tables.messages
    expect(events[0]).toEqual({
      type: 'meta',
      conversationId: conversation.id,
      userMessageId: question?.id,
      title: 'What does the Pro plan cost?',
    })
    expect(
      events
        .filter((event) => event.type === 'delta')
        .map((event) => event.text)
        .join('')
    ).toBe(ANSWER)
    expect(events.at(-1)).toEqual({
      type: 'done',
      userMessageId: question?.id,
      assistantMessageId: answer?.id,
      finishReason: 'stop',
    })
    expect(outcome).toEqual({ userMessage: question, assistantMessage: answer })
    expect(question).toMatchObject({ role: 'user', content: QUESTION.content })
    expect(answer).toMatchObject({ role: 'assistant', content: ANSWER, finishReason: 'stop' })
  })

  it('numbers every prompt source and stores which ones the answer cited', async () => {
    const { service, store, chat, conversation } = await setup()

    const { events } = await send(service, conversation)

    const sources = events.find((event) => event.type === 'sources')
    expect(
      sources?.type === 'sources' &&
        sources.citations.map(({ index, chunkId, cited }) => [index, chunkId, cited])
    ).toEqual([
      [1, 'chunk-plans', false],
      [2, 'chunk-trial', false],
      [3, 'chunk-refunds', false],
    ])
    expect(store.tables.messages[1]?.citations.map(({ cited }) => cited)).toEqual([
      true,
      false,
      true,
    ])
    expect(chat.requests[0]?.messages[0]?.content).toContain('[3] «Pricing › refunds»')
    expect(chat.requests[0]?.messages.at(-1)).toEqual({ role: 'user', content: QUESTION.content })
  })

  it('stores retrieval and timing diagnostics with the answer', async () => {
    const { service, store, conversation } = await setup()

    await send(service, conversation)

    const row = store.tables.insertedRows[1]
    expect(row).toMatchObject({ provider: 'fake', model: 'fake-chat', finish_reason: 'stop' })
    const { retrieval, timing } = row?.metadata as AnswerMetadata
    expect(retrieval).toMatchObject({
      mode: 'hybrid',
      query: QUESTION.content,
      rewrittenQuery: null,
      sourceCount: 3,
    })
    expect(retrieval.latencyMs).toBeGreaterThanOrEqual(0)
    expect(timing.firstTokenMs).toBeGreaterThanOrEqual(0)
    expect(timing.totalMs).toBeGreaterThanOrEqual(timing.firstTokenMs ?? 0)
  })

  it('names an untitled conversation after its first question and keeps a given title', async () => {
    const { service, store, conversation } = await setup({ replies: [ANSWER, ANSWER] })
    const titled = await store.conversations.insert(USER.db, { title: 'My own title' })

    await send(service, conversation)
    const { events } = await send(service, titled)

    expect(store.tables.conversations.get(conversation.id)?.title).toBe(
      'What does the Pro plan cost?'
    )
    expect(events[0]).toMatchObject({ type: 'meta', title: 'My own title' })
  })

  it('searches the first question as asked and rewrites follow-ups', async () => {
    const replies = ['Plans are listed [1].', 'Pro plan pricing', 'It costs 20 euros [1].']
    const { service, store, chat, embedder, retrieval, usage, conversation } = await setup({
      replies,
    })

    await send(service, conversation, { content: 'Tell me about the Pro plan' })
    await send(service, conversation, { content: 'what about its pricing?' })

    expect(chat.requests).toHaveLength(3)
    expect(embedder.requests.map(({ texts }) => texts)).toEqual([
      ['Tell me about the Pro plan'],
      ['Pro plan pricing'],
    ])
    expect(retrieval.keywordSearches.map(({ text }) => text)).toEqual([
      'Tell me about the Pro plan',
      'Pro plan pricing',
    ])
    expect(store.tables.insertedRows[3]?.metadata).toMatchObject({
      retrieval: { query: 'what about its pricing?', rewrittenQuery: 'Pro plan pricing' },
    })
    expect(usage.map(({ kind }) => kind)).toEqual([
      'embedding',
      'chat',
      'query_rewrite',
      'embedding',
      'chat',
    ])
  })

  it('keeps earlier turns in the prompt, before the new question', async () => {
    const { service, chat, conversation } = await setup({
      replies: ['First answer.', 'rewritten', 'Second answer.'],
    })

    await send(service, conversation, { content: 'First question' })
    await send(service, conversation, { content: 'Second question' })

    expect(chat.requests[2]?.messages.slice(1)).toEqual([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer.' },
      { role: 'user', content: 'Second question' },
    ])
  })

  it('stores the partial answer as aborted when the client leaves, and sends no done', async () => {
    const { service, store, usage, conversation } = await setup()
    const abort = new AbortController()
    const run = await service.prepare(USER, conversation.id, QUESTION)

    const { events, outcome } = await drain(run.events(abort.signal), (event) => {
      if (event.type === 'delta') abort.abort()
    })

    expect(typesOf(events)).toEqual(['meta', 'sources', 'delta'])
    const answer = store.tables.messages[1]
    expect(answer).toMatchObject({ role: 'assistant', finishReason: 'aborted' })
    expect(ANSWER.startsWith(answer?.content ?? '-')).toBe(true)
    expect(answer?.content.length).toBeLessThan(ANSWER.length)
    expect(outcome?.assistantMessage).toEqual(answer)
    expect(usage.at(-1)).toMatchObject({
      kind: 'chat',
      messageId: answer?.id,
      usage: { estimated: true },
    })
  })

  it('reports a provider failure before the first token and stores no empty answer', async () => {
    const { service, store, conversation } = await setup({ replies: [{ error: PROVIDER_DOWN }] })

    const { events, outcome } = await send(service, conversation)

    expect(typesOf(events)).toEqual(['meta', 'sources', 'error'])
    expect(events.at(-1)).toEqual({
      type: 'error',
      code: 'ai_provider_unavailable',
      message: 'The AI provider is temporarily unavailable; try again shortly',
    })
    expect(store.tables.messages.map(({ role }) => role)).toEqual(['user'])
    expect(outcome).toMatchObject({ assistantMessage: null })
  })

  it('keeps the text streamed before a provider failure, marked as an error', async () => {
    const { service, store, conversation } = await setup({
      replies: [{ text: 'The Pro plan costs', error: PROVIDER_DOWN }],
    })

    const { events } = await send(service, conversation)

    expect(typesOf(events)).toEqual(['meta', 'sources', 'delta', 'error'])
    expect(store.tables.messages[1]).toMatchObject({
      content: 'The Pro plan costs',
      finishReason: 'error',
    })
  })

  it('drops U+0000 from the answer before streaming or storing it', async () => {
    const clean = 'The Pro plan costs 20 euros [1].'
    const { service, store, conversation } = await setup({
      replies: [`${'\u0000'.repeat(6)}The Pro\u0000 plan costs 20 euros [1].`],
    })

    const { events } = await send(service, conversation)

    const deltas = events.flatMap((event) => (event.type === 'delta' ? [event.text] : []))
    expect(deltas.join('')).toBe(clean)
    expect(deltas).not.toContain('')
    expect(store.tables.messages[1]?.content).toBe(clean)
  })

  it('reports the usage the provider gave, and estimates it, flagged, when it gave none', async () => {
    const reported = await setup({ replies: [{ text: ANSWER, usage: REPORTED_USAGE }] })
    const estimated = await setup()

    const withUsage = await send(reported.service, reported.conversation)
    const withoutUsage = await send(estimated.service, estimated.conversation)

    expect(withUsage.events.find(({ type }) => type === 'usage')).toEqual({
      type: 'usage',
      ...REPORTED_USAGE,
      estimated: false,
      model: 'fake-chat',
    })
    expect(withoutUsage.events.find(({ type }) => type === 'usage')).toMatchObject({
      estimated: true,
      completionTokens: counter.count(ANSWER),
    })
    expect(estimated.store.tables.messages[1]?.usage?.estimated).toBe(true)
  })

  it('limits retrieval to the chosen documents and answers honestly when nothing is found', async () => {
    const { service, retrieval, chat, conversation } = await setup()
    retrieval.vectorHits = []

    const { events } = await send(service, conversation, {
      content: 'Anything about Mars?',
      documentIds: [TEST_DOCUMENT_ID],
    })

    expect(retrieval.vectorSearches[0]?.documentIds).toEqual([TEST_DOCUMENT_ID])
    expect(events.find(({ type }) => type === 'sources')).toEqual({
      type: 'sources',
      citations: [],
    })
    expect(chat.requests[0]?.messages[0]?.content).toContain(NO_SOURCES_NOTICE)
  })

  it('reports a failure to embed the question after the meta event', async () => {
    const embedding = new FakeEmbeddingModel({
      failures: [new AiProviderError('authentication', 'Bad key', { provider: 'fake' })],
    })
    const { service, store, conversation } = await setup({ embedding })

    const { events } = await send(service, conversation)

    expect(typesOf(events)).toEqual(['meta', 'error'])
    expect(events.at(-1)).toMatchObject({ code: 'ai_provider_error' })
    expect(store.tables.messages).toHaveLength(1)
  })

  it('reports a database failure storing the question as the only event', async () => {
    const { service, store, conversation } = await setup()
    store.messages.insertFailures.push(new Error('connection reset'))

    const { events, outcome } = await send(service, conversation)

    expect(events).toEqual([
      { type: 'error', code: 'internal_error', message: 'Unexpected server error' },
    ])
    expect(outcome).toBeNull()
  })

  it('answers 404 before storing anything for a conversation the caller cannot see', async () => {
    const { service, store } = await setup()

    const error: unknown = await service
      .prepare(USER, TEST_CONVERSATION_ID, QUESTION)
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiHttpException)
    expect((error as ApiHttpException).getStatus()).toBe(404)
    expect(store.tables.messages).toEqual([])
  })
})
