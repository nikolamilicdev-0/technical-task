import type { CreateEmbeddingResponse, Embedding } from 'openai/resources/embeddings'

import { AI_ENV_NAMES } from '../../config/ai-env.schema.js'
import { AiProviderError } from '../../errors/ai-provider-error.js'
import type { AiErrorCode, ProviderCallContext } from '../../errors/ai-provider-error.types.js'
import { abortError } from '../../errors/abort-error.js'
import { mapOpenAiError } from '../../errors/map-openai-error.js'
import { findEmbeddingInputProblem, toEmbeddingSignature } from '../../ports/embedding-contract.js'
import type {
  EmbeddingModel,
  EmbeddingRequest,
  EmbeddingResult,
} from '../../ports/embedding-model.types.js'
import type { ResolvedEmbeddingEndpoint } from '../../providers/resolve-endpoint.types.js'
import { toEmbeddingParams, toTokenUsage } from './mappers.js'
import type { OpenAiLikeClient } from './openai-like-client.types.js'

export class OpenAiCompatibleEmbeddingModel implements EmbeddingModel {
  readonly provider: string
  readonly model: string
  readonly signature: string
  readonly dimensions: number | undefined
  readonly #client: OpenAiLikeClient
  readonly #endpoint: ResolvedEmbeddingEndpoint
  readonly #context: ProviderCallContext
  #observedDimensions: number | undefined

  constructor(client: OpenAiLikeClient, endpoint: ResolvedEmbeddingEndpoint) {
    this.provider = endpoint.provider
    this.model = endpoint.model
    this.dimensions = endpoint.dimensions
    this.signature = toEmbeddingSignature(endpoint.model, endpoint.dimensions)
    this.#client = client
    this.#endpoint = endpoint
    this.#context = { kind: 'embedding', provider: endpoint.provider, model: endpoint.model }
  }

  async embed({ texts, signal }: EmbeddingRequest): Promise<EmbeddingResult> {
    const inputProblem = findEmbeddingInputProblem(texts)
    if (inputProblem !== undefined) throw this.#error('invalid_request', inputProblem)
    const response = await this.#request(texts, signal)
    // The SDK types `data` as required, yet a compatible server can answer 2xx without it.
    const vectors = this.#readVectors(response.data ?? [], texts.length)
    return {
      ...vectors,
      usage: response.usage === undefined ? undefined : toTokenUsage(response.usage),
      model: response.model || this.model,
    }
  }

  async #request(
    texts: readonly string[],
    signal: AbortSignal | undefined
  ): Promise<CreateEmbeddingResponse> {
    try {
      return await this.#client.embeddings.create(toEmbeddingParams(this.#endpoint, texts), {
        signal,
      })
    } catch (error) {
      throw signal?.aborted
        ? abortError(this.#context, error)
        : mapOpenAiError(error, this.#context)
    }
  }

  #readVectors(
    data: readonly Embedding[],
    inputCount: number
  ): Pick<EmbeddingResult, 'embeddings' | 'dimensions'> {
    // The SDK types `index` as required; Gemini (proto3 JSON) omits it when it is 0.
    const items = data
      .map((item) => ({ ...item, index: item.index ?? 0 }))
      .sort((left, right) => left.index - right.index)
    if (items.length !== inputCount || items.some((item, position) => item.index !== position)) {
      const message = `${this.provider} returned ${items.length} embeddings for ${inputCount} texts`
      throw this.#error('server', message)
    }
    const expected = this.dimensions ?? this.#observedDimensions ?? items[0].embedding.length
    const mismatch = items.find((item) => item.embedding.length !== expected)
    if (mismatch !== undefined) {
      throw this.#error('unsupported', this.#describeMismatch(mismatch.embedding.length, expected))
    }
    this.#observedDimensions = expected
    return { embeddings: items.map((item) => item.embedding), dimensions: expected }
  }

  #describeMismatch(actual: number, expected: number): string {
    const summary = `"${this.model}" returned ${actual}-dimension vectors instead of ${expected}`
    if (this.dimensions === undefined) {
      return `${summary}; the model behind this name changed, so restart and re-index`
    }
    if (this.#endpoint.supportsEmbeddingDimensions) return `${summary} despite requesting them`
    const setting = AI_ENV_NAMES.embedding.dimensions
    return `${summary}; ${this.provider} cannot shorten vectors, so unset ${setting} or set it to ${actual}`
  }

  #error(code: AiErrorCode, message: string): AiProviderError {
    return new AiProviderError(code, message, { provider: this.provider, model: this.model })
  }
}
