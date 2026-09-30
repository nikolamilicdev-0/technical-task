import type { ChatErrorEvent } from '@kb/contracts'

import { isApiError } from '@/core/api/api-error'
import type { StreamError, StreamErrorCode } from '@/features/chat/types'

/** The stream ended, or its body broke off, before `done` or an `error` frame. */
export const INTERRUPTED_STREAM_ERROR: StreamError = {
  code: 'interrupted',
  message: null,
  retryAfter: null,
}

// Sending the same question again would fail the same way.
const FINAL_CODES: ReadonlySet<StreamErrorCode> = new Set([
  'not_found',
  'invalid_payload',
  'forbidden',
  'unauthenticated',
])

/**
 * A failed send as the error row explains it. API errors keep their code and retry delay; a
 * failure that is no API error happened while reading the body, so the stream was interrupted.
 */
export function toStreamError(error: unknown): StreamError {
  if (!isApiError(error)) return INTERRUPTED_STREAM_ERROR
  if (error.isNetworkError) return { code: 'network', message: null, retryAfter: null }
  return {
    code: error.code,
    message: error.messages[0] ?? null,
    retryAfter: error.retryAfter ?? null,
  }
}

/** An `error` frame, sent when the answer failed after the stream had opened. */
export function fromErrorEvent(event: ChatErrorEvent): StreamError {
  return {
    code: event.code,
    message: event.message || null,
    retryAfter: event.retryAfter ?? null,
  }
}

export function canRetry(error: StreamError): boolean {
  return !FINAL_CODES.has(error.code)
}
