import { APIUserAbortError } from 'openai'
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources/chat/completions'
import type { CreateEmbeddingResponse, EmbeddingCreateParams } from 'openai/resources/embeddings'

import type {
  OpenAiLikeClient,
  OpenAiRequestOptions,
} from '../src/adapters/openai-compatible/openai-like-client.types.js'
import { nextMacrotask } from '../src/testing/next-macrotask.js'
import { buildCompletion } from './fixtures.js'

type ChatCreateParams = ChatCompletionCreateParamsStreaming | ChatCompletionCreateParamsNonStreaming

export interface RecordedCall<TBody> {
  body: TBody
  options: OpenAiRequestOptions | undefined
}

/** What the fake answers; `failure` rejects `create()`, `streamFailure` ends a stream. */
export interface FakeOpenAiScript {
  chunks?: ChatCompletionChunk[]
  completion?: ChatCompletion
  embeddingResponses?: CreateEmbeddingResponse[]
  failure?: Error
  streamFailure?: Error
}

class FakeChatCompletions {
  readonly calls: RecordedCall<ChatCreateParams>[] = []
  readonly #script: FakeOpenAiScript

  constructor(script: FakeOpenAiScript) {
    this.#script = script
  }

  create(
    body: ChatCompletionCreateParamsStreaming,
    options?: OpenAiRequestOptions
  ): Promise<AsyncIterable<ChatCompletionChunk>>
  create(
    body: ChatCompletionCreateParamsNonStreaming,
    options?: OpenAiRequestOptions
  ): Promise<ChatCompletion>
  async create(
    body: ChatCreateParams,
    options?: OpenAiRequestOptions
  ): Promise<AsyncIterable<ChatCompletionChunk> | ChatCompletion> {
    this.calls.push({ body, options })
    await nextMacrotask()
    if (options?.signal?.aborted) throw new APIUserAbortError()
    if (this.#script.failure !== undefined) throw this.#script.failure
    if (!body.stream) return this.#script.completion ?? buildCompletion('Hello')
    return this.#stream(options?.signal)
  }

  // Mirrors the SDK: an abort once streaming has started ends the iteration without an error.
  async *#stream(signal: AbortSignal | undefined): AsyncGenerator<ChatCompletionChunk> {
    for (const chunk of this.#script.chunks ?? []) {
      await nextMacrotask()
      if (signal?.aborted) return
      yield chunk
    }
    if (this.#script.streamFailure !== undefined) throw this.#script.streamFailure
  }
}

class FakeEmbeddings {
  readonly calls: RecordedCall<EmbeddingCreateParams>[] = []
  readonly #script: FakeOpenAiScript

  constructor(script: FakeOpenAiScript) {
    this.#script = script
  }

  async create(
    body: EmbeddingCreateParams,
    options?: OpenAiRequestOptions
  ): Promise<CreateEmbeddingResponse> {
    this.calls.push({ body, options })
    await nextMacrotask()
    if (options?.signal?.aborted) throw new APIUserAbortError()
    if (this.#script.failure !== undefined) throw this.#script.failure
    const response = this.#script.embeddingResponses?.shift()
    if (response === undefined) throw new Error('FakeOpenAiClient: no embedding response scripted')
    return response
  }
}

export class FakeOpenAiClient implements OpenAiLikeClient {
  readonly chat: { readonly completions: FakeChatCompletions }
  readonly embeddings: FakeEmbeddings

  constructor(script: FakeOpenAiScript = {}) {
    this.chat = { completions: new FakeChatCompletions(script) }
    this.embeddings = new FakeEmbeddings(script)
  }
}
