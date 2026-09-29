import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources/chat/completions'
import type { CreateEmbeddingResponse, EmbeddingCreateParams } from 'openai/resources/embeddings'

import type { ResolvedEndpoint } from '../../providers/resolve-endpoint.types.js'

/** Per-call options the adapters pass to the SDK. */
export interface OpenAiRequestOptions {
  signal?: AbortSignal
}

/** The slice of the OpenAI SDK client the adapters call; tests substitute fakes for it. */
export interface OpenAiLikeClient {
  readonly chat: {
    readonly completions: {
      create(
        body: ChatCompletionCreateParamsStreaming,
        options?: OpenAiRequestOptions
      ): Promise<AsyncIterable<ChatCompletionChunk>>
      create(
        body: ChatCompletionCreateParamsNonStreaming,
        options?: OpenAiRequestOptions
      ): Promise<ChatCompletion>
    }
  }
  readonly embeddings: {
    create(
      body: EmbeddingCreateParams,
      options?: OpenAiRequestOptions
    ): Promise<CreateEmbeddingResponse>
  }
}

/** Opens an SDK client for one resolved endpoint. */
export type CreateOpenAiClient = (endpoint: ResolvedEndpoint) => OpenAiLikeClient
