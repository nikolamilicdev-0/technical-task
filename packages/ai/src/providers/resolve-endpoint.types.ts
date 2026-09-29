import type { ProviderId } from './provider-ids.js'
import type { MaxTokensParam } from './provider-profiles.types.js'

/** Everything needed to open a connection to one provider for one model. */
export interface ResolvedEndpoint {
  readonly provider: ProviderId
  readonly baseUrl: string
  readonly apiKey: string
  readonly headers: Readonly<Record<string, string>>
  readonly model: string
  readonly timeoutMs: number
  readonly maxRetries: number
}

/** Chat endpoint plus the request quirks of its provider. */
export interface ResolvedChatEndpoint extends ResolvedEndpoint {
  readonly streamUsage: boolean
  readonly maxTokensParam: MaxTokensParam
  readonly temperature?: number
}

/** Embedding endpoint plus the output-size settings of its provider. */
export interface ResolvedEmbeddingEndpoint extends ResolvedEndpoint {
  readonly dimensions?: number
  readonly supportsEmbeddingDimensions: boolean
}
