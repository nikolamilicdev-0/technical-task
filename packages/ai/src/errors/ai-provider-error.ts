import type { AiErrorCode, AiProviderErrorDetails } from './ai-provider-error.types.js'

const RETRYABLE_CODES: ReadonlySet<AiErrorCode> = new Set([
  'rate_limited',
  'timeout',
  'connection',
  'server',
])

export class AiProviderError extends Error {
  override readonly name = 'AiProviderError'
  readonly code: AiErrorCode
  readonly details: AiProviderErrorDetails

  constructor(code: AiErrorCode, message: string, details: AiProviderErrorDetails) {
    super(message, { cause: details.cause })
    this.code = code
    this.details = details
  }

  get retryable(): boolean {
    return RETRYABLE_CODES.has(this.code)
  }
}
