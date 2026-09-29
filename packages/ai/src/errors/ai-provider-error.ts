import type { AiErrorCode, AiProviderErrorDetails } from './ai-provider-error.types.js'

const RETRYABLE_CODES: ReadonlySet<AiErrorCode> = new Set([
  'rate_limited',
  'timeout',
  'connection',
  'server',
])

/** Every failure raised by a chat or embedding model: a neutral code plus diagnostics. */
export class AiProviderError extends Error {
  override readonly name = 'AiProviderError'
  readonly code: AiErrorCode
  readonly details: AiProviderErrorDetails

  constructor(code: AiErrorCode, message: string, details: AiProviderErrorDetails) {
    super(message, { cause: details.cause })
    this.code = code
    this.details = details
  }

  /** True for transient failures (rate limits, timeouts, outages) that may succeed later. */
  get retryable(): boolean {
    return RETRYABLE_CODES.has(this.code)
  }
}
