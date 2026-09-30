import type { ErrorCode } from '@kb/contracts'

/** Client-safe copy per code; 5xx responses always use it so internals stay in the logs. */
export const DEFAULT_ERROR_MESSAGES = {
  invalid_payload: 'Invalid request payload',
  unauthenticated: 'Authentication required',
  forbidden: 'You do not have access to this resource',
  not_found: 'Resource not found',
  payload_too_large: 'Request payload is too large',
  unsupported_media_type: 'Unsupported media type',
  rate_limited: 'Too many requests; try again shortly',
  ai_provider_error: 'The AI provider could not complete the request',
  ai_provider_unavailable: 'The AI provider is temporarily unavailable; try again shortly',
  internal_error: 'Unexpected server error',
} as const satisfies Record<ErrorCode, string>

export const RETRY_AFTER_HEADER = 'Retry-After'

export const HTTP_CLIENT_ERROR_MIN = 400
export const HTTP_SERVER_ERROR_MIN = 500
