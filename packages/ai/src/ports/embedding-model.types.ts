import type { TokenUsage } from './chat-model.types.js'

/** One provider call; batching is the caller's job. */
export interface EmbeddingRequest {
  texts: readonly string[]
  signal?: AbortSignal
}

/** One vector per input text, in input order. */
export interface EmbeddingResult {
  embeddings: number[][]
  dimensions: number
  usage?: TokenUsage
  model: string
}

/** Implementations throw `AiProviderError` only. */
export interface EmbeddingModel {
  readonly provider: string
  readonly model: string
  /** The vector space: `model`, or `model#dimensions` when dimensions are configured. */
  readonly signature: string
  readonly dimensions?: number
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>
}
