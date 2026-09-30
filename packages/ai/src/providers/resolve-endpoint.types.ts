import type { ProviderId } from './provider-ids.js'
import type { MaxTokensParam } from './provider-profiles.types.js'

export interface ResolvedEndpoint {
  readonly provider: ProviderId
  readonly baseUrl: string
  readonly apiKey: string
  readonly headers: Readonly<Record<string, string>>
  readonly model: string
  readonly timeoutMs: number
  readonly maxRetries: number
}

export interface ResolvedChatEndpoint extends ResolvedEndpoint {
  readonly streamUsage: boolean
  readonly maxTokensParam: MaxTokensParam
  readonly temperature?: number
}

export interface ResolvedEmbeddingEndpoint extends ResolvedEndpoint {
  readonly dimensions?: number
  readonly supportsEmbeddingDimensions: boolean
}
