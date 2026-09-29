import { AiProviderError } from '@kb/ai'
import { type ApiErrorBody, ERROR_HTTP_STATUS, type ErrorCode } from '@kb/contracts'
import { HttpException } from '@nestjs/common'

import { ApiHttpException } from './api-http.exception.js'
import {
  DEFAULT_ERROR_MESSAGES,
  HTTP_CLIENT_ERROR_MIN,
  HTTP_SERVER_ERROR_MIN,
} from './error.constants.js'
import type { ApiErrorDetails, ErrorResponse } from './errors.types.js'

// Statuses Nest, Express and body-parser raise; any other 4xx is treated as a payload problem.
const CLIENT_ERROR_CODES: ReadonlyMap<number, ErrorCode> = new Map([
  [400, 'invalid_payload'],
  [401, 'unauthenticated'],
  [403, 'forbidden'],
  [404, 'not_found'],
  [413, 'payload_too_large'],
  [415, 'unsupported_media_type'],
  [422, 'invalid_payload'],
  [429, 'rate_limited'],
])
const FALLBACK_CLIENT_ERROR_CODE: ErrorCode = 'invalid_payload'

/** Maps anything thrown while serving a request onto the shared error shape (pure). */
export function mapErrorToResponse(error: unknown): ErrorResponse {
  if (error instanceof ApiHttpException) return respond(error.body)
  if (error instanceof AiProviderError) return fromAiProviderError(error)
  if (error instanceof HttpException) return fromStatus(error.getStatus(), messagesOf(error))
  const clientError = exposedClientError(error)
  if (clientError !== undefined) return fromStatus(clientError.status, [clientError.message])
  return generic('internal_error')
}

function respond(body: ApiErrorBody): ErrorResponse {
  return { status: ERROR_HTTP_STATUS[body.code], body }
}

function generic(code: ErrorCode, details: ApiErrorDetails = {}): ErrorResponse {
  return respond({ code, messages: [DEFAULT_ERROR_MESSAGES[code]], ...details })
}

// Transient failures (rate limits, timeouts, outages) are worth retrying; the rest are not.
function fromAiProviderError(error: AiProviderError): ErrorResponse {
  if (!error.retryable) return generic('ai_provider_error')
  const retryAfter = toRetryAfter(error.details.retryAfterSeconds)
  return generic('ai_provider_unavailable', retryAfter === undefined ? {} : { retryAfter })
}

// Client errors keep their client-facing messages; server errors only ever show generic copy.
function fromStatus(status: number, messages: readonly string[]): ErrorResponse {
  if (status < HTTP_CLIENT_ERROR_MIN || status >= HTTP_SERVER_ERROR_MIN) {
    return generic('internal_error')
  }
  const code = CLIENT_ERROR_CODES.get(status) ?? FALLBACK_CLIENT_ERROR_CODE
  if (messages.length === 0) return generic(code)
  return respond({ code, messages: [...messages] })
}

function messagesOf(exception: HttpException): string[] {
  const response = exception.getResponse()
  if (typeof response === 'string') return [response]
  const message = 'message' in response ? response.message : undefined
  if (typeof message === 'string') return [message]
  if (Array.isArray(message)) return message.filter(isString)
  return [exception.message]
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

// http-errors (body-parser) sets `expose` exactly when the message is safe to show to clients.
function exposedClientError(error: unknown): { status: number; message: string } | undefined {
  if (!(error instanceof Error) || !('expose' in error) || error.expose !== true) return undefined
  const status = 'status' in error ? error.status : undefined
  return typeof status === 'number' ? { status, message: error.message } : undefined
}

function toRetryAfter(seconds: number | undefined): number | undefined {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return undefined
  return Math.ceil(seconds)
}
