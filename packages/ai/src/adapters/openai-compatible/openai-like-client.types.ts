import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources/chat/completions'
import type { CreateEmbeddingResponse, EmbeddingCreateParams } from 'openai/resources/embeddings'

import type { ResolvedEndpoint } from '../../providers/resolve-endpoint.types.js'

export interface OpenAiRequestOptions {
  signal?: AbortSignal
}

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

export type CreateOpenAiClient = (endpoint: ResolvedEndpoint) => OpenAiLikeClient
