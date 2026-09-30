import type { AiProviderError } from '../../errors/ai-provider-error.js'
import type { ProviderCallContext } from '../../errors/ai-provider-error.types.js'
import { abortError } from '../../errors/abort-error.js'
import { mapOpenAiError } from '../../errors/map-openai-error.js'
import type {
  ChatCompletion,
  ChatModel,
  ChatRequest,
  ChatStreamEvent,
  FinishReason,
  TokenUsage,
} from '../../ports/chat-model.types.js'
import type { ResolvedChatEndpoint } from '../../providers/resolve-endpoint.types.js'
import { toChatCompletion, toChatParams, toFinishReason, toTokenUsage } from './mappers.js'
import type { OpenAiLikeClient } from './openai-like-client.types.js'

const STREAM_USAGE_OPTIONS = { stream_options: { include_usage: true } }

export class OpenAiCompatibleChatModel implements ChatModel {
  readonly provider: string
  readonly model: string
  readonly #client: OpenAiLikeClient
  readonly #endpoint: ResolvedChatEndpoint
  readonly #context: ProviderCallContext

  constructor(client: OpenAiLikeClient, endpoint: ResolvedChatEndpoint) {
    this.provider = endpoint.provider
    this.model = endpoint.model
    this.#client = client
    this.#endpoint = endpoint
    this.#context = { kind: 'chat', provider: endpoint.provider, model: endpoint.model }
  }

  async complete(request: ChatRequest): Promise<ChatCompletion> {
    try {
      const response = await this.#client.chat.completions.create(
        { ...toChatParams(this.#endpoint, request), stream: false },
        { signal: request.signal }
      )
      return toChatCompletion(response, this.model)
    } catch (error) {
      throw this.#toProviderError(error, request.signal)
    }
  }

  // The SDK timeout only bounds the wait for response headers; a stalled body lasts until
  // the caller's signal aborts it.
  async *stream(request: ChatRequest): AsyncGenerator<ChatStreamEvent, void, undefined> {
    let finishReason: FinishReason = 'unknown'
    let usage: TokenUsage | undefined
    let model = this.model
    try {
      const chunks = await this.#client.chat.completions.create(
        {
          ...toChatParams(this.#endpoint, request),
          stream: true,
          ...(this.#endpoint.streamUsage ? STREAM_USAGE_OPTIONS : {}),
        },
        { signal: request.signal }
      )
      for await (const chunk of chunks) {
        // The SDK types `choices` and `delta` as required; tolerate servers that leave them out.
        const choice = chunk.choices?.at(0)
        const text = choice?.delta?.content
        if (text) yield { type: 'delta', text }
        if (choice?.finish_reason) finishReason = toFinishReason(choice.finish_reason)
        if (chunk.usage) usage = toTokenUsage(chunk.usage)
        if (chunk.model) model = chunk.model
      }
    } catch (error) {
      throw this.#toProviderError(error, request.signal)
    }
    // An abort after the first chunk ends the SDK stream silently; only the signal tells.
    if (request.signal?.aborted) throw abortError(this.#context, request.signal.reason)
    yield { type: 'done', finishReason, usage, model }
  }

  #toProviderError(error: unknown, signal: AbortSignal | undefined): AiProviderError {
    return signal?.aborted ? abortError(this.#context, error) : mapOpenAiError(error, this.#context)
  }
}
