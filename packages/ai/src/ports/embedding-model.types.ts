import type { TokenUsage } from './chat-model.types.js'

/** Texts to embed in one provider call; batching is the caller's job. */
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

/** Embedding port; implementations throw `AiProviderError` only. */
export interface EmbeddingModel {
  readonly provider: string
  readonly model: string
  /** Identifies the vector space: `model`, or `model#dimensions` when dimensions are configured. */
  readonly signature: string
  /** Configured output size; unset means the model's native size. */
  readonly dimensions?: number
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>
}
