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

export interface AiProviderErrorDetails {
  readonly provider: string
  readonly model?: string
  readonly status?: number
  readonly retryAfterSeconds?: number
  readonly cause?: unknown
}

export type AiModelKind = 'chat' | 'embedding'

export interface ProviderCallContext {
  readonly kind: AiModelKind
  readonly provider: string
  readonly model: string
}
