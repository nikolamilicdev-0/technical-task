import type { ProviderId } from './provider-ids.js'

/** Request field that caps the answer length (OpenAI reasoning models reject `max_tokens`). */
export type MaxTokensParam = 'max_tokens' | 'max_completion_tokens'

/** Header names a provider reads app attribution from. */
export interface AttributionHeaderNames {
  readonly appName: string
  readonly appUrl: string
}

interface ProviderCapabilities {
  readonly id: ProviderId
  readonly label: string
  readonly defaultBaseUrl?: string
  readonly defaultChatModel?: string
  readonly defaultEmbeddingModel?: string
  /** Output size requested when none is configured; applied only if `supportsEmbeddingDimensions`. */
  readonly defaultEmbeddingDimensions?: number
  readonly supportsEmbeddings: boolean
  readonly supportsStreamUsage: boolean
  readonly supportsEmbeddingDimensions: boolean
  readonly maxTokensParam: MaxTokensParam
  readonly attributionHeaders?: AttributionHeaderNames
}

// The SDK refuses to build a client without a key, so keyless servers get a placeholder.
type ApiKeyPolicy =
  | { readonly requiresApiKey: true }
  | { readonly requiresApiKey: false; readonly placeholderApiKey: string }

/** Defaults and quirks of one OpenAI-compatible provider. */
export type ProviderProfile = ProviderCapabilities & ApiKeyPolicy
