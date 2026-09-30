import {
  AiProviderError,
  type ChatRequest,
  type ChatStreamEvent,
  FakeChatModel,
  FakeEmbeddingModel,
} from '@kb/ai'
import {
  apiErrorSchema,
  type ChatSseEvent,
  chatResultSchema,
  conversationDetailSchema,
  conversationSchema,
  parseChatSseEvent,
} from '@kb/contracts'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { CHAT_MODEL, EMBEDDING_MODEL } from '../../src/ai/ai.constants.js'
import type { ChatRun } from '../../src/modules/chat/chat.types.js'
import { ConversationsRepository } from '../../src/modules/chat/conversations.repository.js'
import { MessagesRepository } from '../../src/modules/chat/messages.repository.js'
import { RagChatService } from '../../src/modules/chat/rag-chat.service.js'
import { RetrievalRepository } from '../../src/modules/retrieval/retrieval.repository.js'
import { UsageRecorder } from '../../src/modules/usage/usage-recorder.js'
import type { UsageEvent } from '../../src/modules/usage/usage.types.js'
import { inMemoryChat } from '../fakes/in-memory-chat.repositories.js'
import { ScriptedRetrievalRepository } from '../fakes/scripted-retrieval.repository.js'
import { TestApp } from '../fakes/test-app.js'
import { buildCandidate, TEST_CONVERSATION_ID } from '../fixtures/chat.js'

const CHAT_LIMIT = 3
const ANSWER = 'The Pro plan costs 20 euros a month [1].'
const SSE = { Accept: 'text/event-stream' }
const JSON_BODY = { 'Content-Type': 'application/json' }
const PARTIAL = 'The Pro plan costs'
const POLL_MS = 10
const POLL_TIMEOUT_MS = 2_000
// Chunk ids are UUIDs in the database, and the citation contract checks them.
const PLANS_CHUNK_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const TRIAL_CHUNK_ID = '1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5f'

/** Streams like FakeChatModel; while `stalling`, stops after one delta until the caller aborts. */
class StallableChatModel extends FakeChatModel {
  stalling = false

  override async *stream(request: ChatRequest): AsyncGenerator<ChatStreamEvent, void, undefined> {
    if (!this.stalling) {
      yield* super.stream(request)
      return
    }
    yield { type: 'delta', text: PARTIAL }
    await new Promise<void>((resolve) => request.signal?.addEventListener('abort', () => resolve()))
    throw new AiProviderError('aborted', 'The chat request was aborted', { provider: 'fake' })
  }
}

const store = inMemoryChat()
const chat = new StallableChatModel({ defaultReply: ANSWER })
const usage: UsageEvent[] = []
let api: TestApp

beforeAll(async () => {
  const retrieval = new ScriptedRetrievalRepository()
  retrieval.vectorHits = [
    buildCandidate('plans', { chunkId: PLANS_CHUNK_ID, similarity: 0.9 }),
    buildCandidate('trial', { chunkId: TRIAL_CHUNK_ID, similarity: 0.7 }),
  ]
  api = await TestApp.start(
    (builder) =>
      builder
        .overrideProvider(ConversationsRepository)
        .useValue(store.conversations)
        .overrideProvider(MessagesRepository)
        .useValue(store.messages)
        .overrideProvider(RetrievalRepository)
        .useValue(retrieval)
        .overrideProvider(CHAT_MODEL)
        .useValue(chat)
        .overrideProvider(EMBEDDING_MODEL)
        .useValue(new FakeEmbeddingModel())
        .overrideProvider(UsageRecorder)
        .useValue({ record: (event: UsageEvent) => usage.push(event) }),
    { RATE_LIMIT_CHAT_PER_MINUTE: String(CHAT_LIMIT) }
  )
})

afterAll(async () => {
  await api.close()
})

/** A minimal SSE reader: every frame validated against the contracts; comments skipped. */
function parseStream(text: string): ChatSseEvent[] {
  return text
    .split('\n\n')
    .filter((frame) => frame !== '' && !frame.startsWith(':'))
    .map((frame) => {
      const lines = frame.split('\n')
      const name = lines.find((line) => line.startsWith('event: '))?.slice('event: '.length)
      const data = lines.find((line) => line.startsWith('data: '))?.slice('data: '.length)
      const event = parseChatSseEvent(name ?? '', data ?? '')
      if (event === null) throw new Error(`Not a chat event frame: ${frame}`)
      return event
    })
}

async function newConversation(headers: Record<string, string>): Promise<string> {
  const { body } = await api.call('/conversations', { method: 'POST', headers })
  return conversationSchema.parse(body).id
}

function sendMessage(
  conversationId: string,
  headers: Record<string, string>,
  body: object = { content: 'What does the Pro plan cost?' }
) {
  return api.call(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { ...headers, ...JSON_BODY },
    body: JSON.stringify(body),
  })
}

async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for the condition')
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
}

describe('messages over HTTP', () => {
  it('streams meta, sources, deltas, usage and done as text/event-stream', async () => {
    const headers = api.signIn()
    const id = await newConversation(headers)

    const { response, text } = await sendMessage(id, { ...headers, ...SSE })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-cache, no-transform')
    const events = parseStream(text)
    expect([...new Set(events.map(({ type }) => type))]).toEqual([
      'meta',
      'sources',
      'delta',
      'usage',
      'done',
    ])
    const deltas = events.flatMap((event) => (event.type === 'delta' ? [event.text] : []))
    expect(deltas.join('')).toBe(ANSWER)
  })

  it('stores the exchange: GET shows both messages, the cited source flagged', async () => {
    const headers = api.signIn()
    const id = await newConversation(headers)
    await sendMessage(id, { ...headers, ...SSE })

    const { body } = await api.call(`/conversations/${id}`, { headers })

    const detail = conversationDetailSchema.parse(body)
    expect(detail.conversation.title).toBe('What does the Pro plan cost?')
    expect(detail.messages.map(({ role }) => role)).toEqual(['user', 'assistant'])
    expect(detail.messages[1]?.citations.map(({ cited }) => cited)).toEqual([true, false])
  })

  it('answers with the whole ChatResult as JSON when the client does not ask for SSE', async () => {
    const headers = api.signIn()
    const id = await newConversation(headers)

    const { response, body } = await sendMessage(id, headers)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    const result = chatResultSchema.parse(body)
    expect(result.assistantMessage).toMatchObject({ content: ANSWER, finishReason: 'stop' })
    expect(result.usage).toMatchObject({ model: 'fake-chat', estimated: true })
  })

  it('answers 404 as JSON, before any stream, for a conversation the caller cannot see', async () => {
    const { response, body } = await sendMessage(TEST_CONVERSATION_ID, { ...api.signIn(), ...SSE })

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(body).toEqual({ code: 'not_found', messages: ['Conversation not found'] })
  })

  it('rejects an empty message with 422', async () => {
    const headers = api.signIn()
    const id = await newConversation(headers)

    const { response, body } = await sendMessage(id, headers, { content: '   ' })

    expect(response.status).toBe(422)
    expect(apiErrorSchema.parse(body).errors).toHaveProperty('content')
  })

  it('allows RATE_LIMIT_CHAT_PER_MINUTE messages a minute, then answers 429 with a retry hint', async () => {
    const headers = api.signIn()
    const id = await newConversation(headers)

    const statuses: number[] = []
    for (let sent = 0; sent < CHAT_LIMIT; sent += 1) {
      statuses.push((await sendMessage(id, headers)).response.status)
    }
    const { response, body } = await sendMessage(id, headers)

    expect(statuses).toEqual([200, 200, 200])
    expect(response.status).toBe(429)
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(apiErrorSchema.parse(body)).toMatchObject({ code: 'rate_limited' })
  })

  it('keeps the partial answer, marked aborted, when the client disconnects mid-stream', async () => {
    const headers = api.signIn()
    const id = await newConversation(headers)
    const abort = new AbortController()
    chat.stalling = true
    try {
      const response = await fetch(`${api.baseUrl}/conversations/${id}/messages`, {
        method: 'POST',
        headers: { ...headers, ...SSE, ...JSON_BODY },
        body: JSON.stringify({ content: 'What does the Pro plan cost?' }),
        signal: abort.signal,
      })
      // Node types a fetch body as ReadableStream<any>; its chunks are bytes.
      const reader = (response.body as ReadableStream<Uint8Array> | null)?.getReader()
      const decoder = new TextDecoder()
      let received = ''
      while (reader !== undefined && !received.includes('event: delta')) {
        const chunk = await reader.read()
        received += decoder.decode(chunk.value, { stream: true })
      }
      abort.abort()

      await waitFor(() =>
        store.tables.messages.some((message) => message.finishReason === 'aborted')
      )
    } finally {
      chat.stalling = false
    }

    const answer = store.tables.messages.find((message) => message.finishReason === 'aborted')
    expect(answer).toMatchObject({ conversationId: id, role: 'assistant', content: PARTIAL })
    expect(usage.at(-1)).toMatchObject({ kind: 'chat', messageId: answer?.id })
  })
})

describe('a stream that fails after its headers were sent', () => {
  let failing: TestApp

  beforeAll(async () => {
    const run: ChatRun = {
      events: async function* () {
        yield { type: 'delta', text: 'Half an answer' }
        throw new Error('the run broke')
      },
    }
    failing = await TestApp.start((builder) =>
      builder.overrideProvider(RagChatService).useValue({ prepare: () => Promise.resolve(run) })
    )
  })

  afterAll(async () => {
    await failing.close()
  })

  it('ends with an error frame instead of a JSON error, and closes the connection', async () => {
    const { response, text } = await failing.call(
      `/conversations/${TEST_CONVERSATION_ID}/messages`,
      {
        method: 'POST',
        headers: { ...failing.signIn(), ...SSE, ...JSON_BODY },
        body: JSON.stringify({ content: 'Hello?' }),
      }
    )

    expect(response.status).toBe(200)
    expect(parseStream(text)).toEqual([
      { type: 'delta', text: 'Half an answer' },
      { type: 'error', code: 'internal_error', message: 'Unexpected server error' },
    ])
  })
})
