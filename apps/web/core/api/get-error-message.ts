import { isApiError } from '@/core/api/api-error'
import type { ErrorMessages } from '@/core/api/types'
import { interpolate } from '@/core/i18n/interpolate'

/**
 * User-facing copy for any thrown error: localized per error code, falling back to the server's
 * first message and then to generic copy. Rate limits say when to retry.
 */
export function getErrorMessage(error: unknown, messages: ErrorMessages): string {
  if (!isApiError(error)) return messages.unknown
  if (error.isNetworkError) return messages.network
  if (error.code === 'rate_limited' && error.retryAfter) {
    return interpolate(messages.rateLimitedRetry, { seconds: error.retryAfter })
  }
  return messages.codes[error.code] ?? error.messages[0] ?? messages.unknown
}
