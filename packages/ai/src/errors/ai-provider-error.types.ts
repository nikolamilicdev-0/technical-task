/** Provider-neutral failure categories. */
export type AiErrorCode =
  | 'authentication'
  | 'permission'
  | 'not_found'
  | 'invalid_request'
  | 'rate_limited'
  | 'timeout'
  | 'connection'
  | 'server'
  | 'aborted'
  | 'unsupported'
  | 'unknown'

/** Diagnostic context carried by every `AiProviderError`. */
export interface AiProviderErrorDetails {
  readonly provider: string
  readonly model?: string
  readonly status?: number
  readonly retryAfterSeconds?: number
  readonly cause?: unknown
}

/** Which configured model a call served; picks the `AI_CHAT_*` or `AI_EMBEDDING_*` names in hints. */
export type AiModelKind = 'chat' | 'embedding'

/** Describes the provider call an error came from. */
export interface ProviderCallContext {
  readonly kind: AiModelKind
  readonly provider: string
  readonly model: string
}
