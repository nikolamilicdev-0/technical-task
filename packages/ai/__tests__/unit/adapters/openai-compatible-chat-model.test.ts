import type { ChatRequest, ChatStreamEvent } from '@kb/ai'
import { APIError, AuthenticationError, NotFoundError, RateLimitError } from 'openai'
import { describe, expect, it } from 'vitest'

import { OpenAiCompatibleChatModel } from '../../../src/adapters/openai-compatible/openai-compatible-chat-model.js'
import type { ResolvedChatEndpoint } from '../../../src/providers/resolve-endpoint.types.js'
import { FakeOpenAiClient, type FakeOpenAiScript } from '../../fake-openai-client.js'
import {
  buildChatEndpoint,
  buildCompletion,
  captureAiError,
  collect,
  contentChunk,
  SERVED_CHAT_MODEL,
  usageChunk,
} from '../../fixtures.js'

const REQUEST: ChatRequest = {
  messages: [
    { role: 'system', content: 'Answer from the sources.' },
    { role: 'user', content: 'What is RAG?' },
  ],
}
const MAPPED_USAGE = { promptTokens: 12, completionTokens: 5, totalTokens: 17 }

function setup(script: FakeOpenAiScript = {}, endpoint: Partial<ResolvedChatEndpoint> = {}) {
  const client = new FakeOpenAiClient(script)
  const model = new OpenAiCompatibleChatModel(client, buildChatEndpoint(endpoint))
  return { calls: client.chat.completions.calls, model }
}

describe('OpenAiCompatibleChatModel', () => {
  it('reports the provider and configured model', () => {
    const { model } = setup({}, { provider: 'groq', model: 'llama-3.3-70b-versatile' })
    expect(model).toMatchObject({ provider: 'groq', model: 'llama-3.3-70b-versatile' })
  })

  describe('stream', () => {
    it('yields a delta per content chunk, then done with finish reason, usage and model', async () => {
      const { model } = setup({
        chunks: [
          contentChunk(''),
          contentChunk('Retrieval-'),
          contentChunk('augmented generation.'),
          contentChunk(null, 'stop'),
          usageChunk(),
        ],
      })
      expect(await collect(model.stream(REQUEST))).toEqual([
        { type: 'delta', text: 'Retrieval-' },
        { type: 'delta', text: 'augmented generation.' },
        { type: 'done', finishReason: 'stop', usage: MAPPED_USAGE, model: SERVED_CHAT_MODEL },
      ])
    })

    it('sends a streaming request with usage reporting and the caller signal', async () => {
      const { signal } = new AbortController()
      const { calls, model } = setup()
      await collect(model.stream({ ...REQUEST, signal }))
      expect(calls).toEqual([
        {
          body: {
            model: 'gpt-4o-mini',
            messages: REQUEST.messages,
            stream: true,
            stream_options: { include_usage: true },
          },
          options: { signal },
        },
      ])
    })

    it('leaves stream_options out when streamed usage is disabled', async () => {
      const { calls, model } = setup({}, { streamUsage: false })
      await collect(model.stream(REQUEST))
      expect(calls[0]?.body).not.toHaveProperty('stream_options')
    })

    it.each([
      ['max_completion_tokens', 'max_tokens'],
      ['max_tokens', 'max_completion_tokens'],
    ] as const)('caps the answer with %s only', async (maxTokensParam, otherParam) => {
      const { calls, model } = setup({}, { maxTokensParam })
      await collect(model.stream({ ...REQUEST, maxTokens: 512 }))
      expect(calls[0]?.body).toMatchObject({ [maxTokensParam]: 512 })
      expect(calls[0]?.body).not.toHaveProperty(otherParam)
    })

    it('omits temperature unless it is configured or requested', async () => {
      const { calls, model } = setup()
      await collect(model.stream(REQUEST))
      await collect(model.stream({ ...REQUEST, temperature: 0.1 }))
      expect(calls[0]?.body).not.toHaveProperty('temperature')
      expect(calls[1]?.body).toMatchObject({ temperature: 0.1 })
    })

    it('reports no usage and an unknown finish reason when the provider sends neither', async () => {
      const { model } = setup({ chunks: [contentChunk('Hi')] })
      const events = await collect(model.stream(REQUEST))
      expect(events.at(-1)).toEqual({
        type: 'done',
        finishReason: 'unknown',
        model: SERVED_CHAT_MODEL,
      })
    })

    it('reports a length cut-off', async () => {
      const { model } = setup({ chunks: [contentChunk('Trunc', 'length')] })
      const events = await collect(model.stream(REQUEST))
      expect(events.at(-1)).toMatchObject({ type: 'done', finishReason: 'length' })
    })

    it('tolerates a chunk without choices, as some compatible servers send usage', async () => {
      const bare = usageChunk()
      Reflect.deleteProperty(bare, 'choices')
      const { model } = setup({ chunks: [contentChunk('Hi', 'stop'), bare] })
      expect(await collect(model.stream(REQUEST))).toEqual([
        { type: 'delta', text: 'Hi' },
        { type: 'done', finishReason: 'stop', usage: MAPPED_USAGE, model: SERVED_CHAT_MODEL },
      ])
    })

    it('throws aborted, not done, when the caller aborts after the first delta', async () => {
      const controller = new AbortController()
      const { model } = setup({
        chunks: [contentChunk('Partial '), contentChunk('answer'), contentChunk(null, 'stop')],
      })
      const events: ChatStreamEvent[] = []
      const error = await captureAiError(async () => {
        for await (const event of model.stream({ ...REQUEST, signal: controller.signal })) {
          events.push(event)
          controller.abort()
        }
      })
      expect(events).toEqual([{ type: 'delta', text: 'Partial ' }])
      expect(error).toMatchObject({ code: 'aborted', details: { provider: 'openai' } })
    })

    it('throws aborted when the signal is aborted before the request', async () => {
      const { model } = setup({ chunks: [contentChunk('Never sent')] })
      const signal = AbortSignal.abort()
      const error = await captureAiError(() => collect(model.stream({ ...REQUEST, signal })))
      expect(error.code).toBe('aborted')
    })

    it('maps a 429 to a retryable rate limit carrying the Retry-After hint', async () => {
      const headers = new Headers({ 'retry-after': '7' })
      const failure = new RateLimitError(429, { message: 'Slow down' }, undefined, headers)
      const error = await captureAiError(() => collect(setup({ failure }).model.stream(REQUEST)))
      expect(error).toMatchObject({
        code: 'rate_limited',
        details: { provider: 'openai', model: 'gpt-4o-mini', status: 429, retryAfterSeconds: 7 },
      })
      expect(error.retryable).toBe(true)
    })

    it('maps a 401 to authentication and names the key variable', async () => {
      const failure = new AuthenticationError(401, { message: 'Bad key' }, undefined, new Headers())
      const error = await captureAiError(() => collect(setup({ failure }).model.stream(REQUEST)))
      expect(error).toMatchObject({ code: 'authentication', details: { status: 401 } })
      expect(error.message).toContain('AI_CHAT_API_KEY')
      expect(error.retryable).toBe(false)
    })

    it('maps an error frame that arrives after some deltas', async () => {
      const streamFailure = new APIError(undefined, { message: 'Overloaded' }, undefined, undefined)
      const { model } = setup({ chunks: [contentChunk('Half')], streamFailure })
      const events: ChatStreamEvent[] = []
      const error = await captureAiError(async () => {
        for await (const event of model.stream(REQUEST)) events.push(event)
      })
      expect(events).toEqual([{ type: 'delta', text: 'Half' }])
      expect(error.code).toBe('server')
    })
  })

  describe('complete', () => {
    it('returns the answer with finish reason, usage and served model', async () => {
      const { model } = setup({ completion: buildCompletion('RAG grounds answers in sources.') })
      expect(await model.complete(REQUEST)).toEqual({
        text: 'RAG grounds answers in sources.',
        finishReason: 'stop',
        usage: MAPPED_USAGE,
        model: SERVED_CHAT_MODEL,
      })
    })

    it('sends a non-streaming request with the caller signal', async () => {
      const { signal } = new AbortController()
      const { calls, model } = setup({}, { maxTokensParam: 'max_tokens', temperature: 0 })
      await model.complete({ ...REQUEST, maxTokens: 64, signal })
      expect(calls).toEqual([
        {
          body: {
            model: 'gpt-4o-mini',
            messages: REQUEST.messages,
            max_tokens: 64,
            temperature: 0,
            stream: false,
          },
          options: { signal },
        },
      ])
    })

    it('maps a missing model to not_found and names the model variable', async () => {
      const failure = new NotFoundError(404, { message: 'No such model' }, undefined, new Headers())
      const error = await captureAiError(() => setup({ failure }).model.complete(REQUEST))
      expect(error.code).toBe('not_found')
      expect(error.message).toContain('AI_CHAT_MODEL')
    })

    it('maps an aborted call to aborted', async () => {
      const signal = AbortSignal.abort()
      const error = await captureAiError(() => setup().model.complete({ ...REQUEST, signal }))
      expect(error.code).toBe('aborted')
    })
  })
})
