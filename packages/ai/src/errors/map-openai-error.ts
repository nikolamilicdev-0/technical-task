import { APIConnectionError, APIConnectionTimeoutError, APIError, APIUserAbortError } from 'openai'

import { AI_ENV_NAMES } from '../config/ai-env.schema.js'
import { abortError } from './abort-error.js'
import { AiProviderError } from './ai-provider-error.js'
import type { AiErrorCode, ProviderCallContext } from './ai-provider-error.types.js'

type ClassifiedErrorCode = Exclude<AiErrorCode, 'unsupported'>
type SummarizedErrorCode = Exclude<ClassifiedErrorCode, 'aborted'>

const BAD_REQUEST_STATUS = 400
const TOO_MANY_REQUESTS_STATUS = 429
// Gemini answers a bad key with 400 INVALID_ARGUMENT, not 401; its chat endpoint wraps the body
// in an array, which the SDK stringifies into the message.
const INVALID_API_KEY_MESSAGE = /API key not valid|pass a valid API key/i
const STATUS_ERROR_CODES: ReadonlyMap<number, SummarizedErrorCode> = new Map([
  [400, 'invalid_request'],
  [401, 'authentication'],
  [402, 'permission'],
  [403, 'permission'],
  [404, 'not_found'],
  [408, 'timeout'],
  [422, 'invalid_request'],
  [TOO_MANY_REQUESTS_STATUS, 'rate_limited'],
])
const CLIENT_ERROR_STATUS_MIN = 400
const SERVER_ERROR_STATUS_MIN = 500
// OpenAI reports an exhausted balance as a 429 that no retry can fix.
const QUOTA_EXHAUSTED_CODE = 'insufficient_quota'
const RETRY_AFTER_HEADER = 'retry-after'
const RETRY_AFTER_MS_HEADER = 'retry-after-ms'
const RETRY_AFTER_SECONDS_MIN = 1
const MS_PER_SECOND = 1_000
const DECIMAL_NUMBER = /^\d+(\.\d+)?$/
// HTTP dates spell out weekday and month; without this, Date.parse reads "-3" as a year.
const HTTP_DATE_LETTER = /[a-z]/i

const ERROR_SUMMARIES: Record<SummarizedErrorCode, (context: ProviderCallContext) => string> = {
  authentication: ({ kind, provider }) =>
    `${provider} rejected the API key; check ${AI_ENV_NAMES[kind].apiKey}`,
  permission: ({ provider, model }) =>
    `${provider} refused access to "${model}"; check the key's permissions, quota and billing`,
  not_found: ({ kind, provider, model }) =>
    `Model "${model}" was not found on ${provider}; check ${AI_ENV_NAMES[kind].model}`,
  invalid_request: ({ provider, model }) => `${provider} rejected the request for "${model}"`,
  rate_limited: ({ provider, model }) => `${provider} rate limit reached for "${model}"`,
  timeout: ({ kind, provider }) =>
    `${provider} did not answer within ${AI_ENV_NAMES[kind].timeoutMs}`,
  connection: ({ kind, provider }) =>
    `Could not reach ${provider}; check ${AI_ENV_NAMES[kind].baseUrl} and the network`,
  server: ({ provider, model }) => `${provider} failed while serving "${model}"`,
  unknown: ({ provider }) => `Unexpected error from ${provider}`,
}

/** Translates any failure of an OpenAI SDK call into an `AiProviderError` (pure given `now`). */
export function mapOpenAiError(
  error: unknown,
  context: ProviderCallContext,
  now: number = Date.now()
): AiProviderError {
  if (error instanceof AiProviderError) return error
  const code = classify(error)
  if (code === 'aborted') return abortError(context, error)
  const apiError = asApiError(error)
  const reason = error instanceof Error ? error.message : String(error)
  return new AiProviderError(code, `${ERROR_SUMMARIES[code](context)} (${reason})`, {
    provider: context.provider,
    model: context.model,
    status: apiError?.status,
    retryAfterSeconds: parseRetryAfter(apiError?.headers, now),
    cause: error,
  })
}

function classify(error: unknown): ClassifiedErrorCode {
  if (error instanceof APIUserAbortError || isAbortError(error)) return 'aborted'
  if (error instanceof APIConnectionTimeoutError) return 'timeout'
  if (error instanceof APIConnectionError) return 'connection'
  const apiError = asApiError(error)
  if (apiError === undefined) return 'unknown'
  const { status } = apiError
  // Error frames inside an SSE stream carry no HTTP status.
  if (status === undefined) return 'server'
  if (status === TOO_MANY_REQUESTS_STATUS && apiError.code === QUOTA_EXHAUSTED_CODE) {
    return 'permission'
  }
  if (status === BAD_REQUEST_STATUS && INVALID_API_KEY_MESSAGE.test(apiError.message)) {
    return 'authentication'
  }
  return STATUS_ERROR_CODES.get(status) ?? classifyStatusRange(status)
}

// `instanceof` on `unknown` yields `APIError<any, any, any>`; this restores the SDK defaults.
function asApiError(error: unknown): APIError | undefined {
  return error instanceof APIError ? error : undefined
}

function classifyStatusRange(status: number): SummarizedErrorCode {
  if (status >= SERVER_ERROR_STATUS_MIN) return 'server'
  if (status >= CLIENT_ERROR_STATUS_MIN) return 'invalid_request'
  return 'unknown'
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

// Same precedence as the SDK's own retry logic: `retry-after-ms`, then seconds or an HTTP date.
function parseRetryAfter(headers: Headers | undefined, now: number): number | undefined {
  const milliseconds = parseDecimal(headers?.get(RETRY_AFTER_MS_HEADER))
  if (milliseconds !== undefined) return toRetrySeconds(milliseconds / MS_PER_SECOND)
  const value = headers?.get(RETRY_AFTER_HEADER)
  if (!value) return undefined
  const seconds = parseDecimal(value) ?? secondsUntilHttpDate(value, now)
  return Number.isFinite(seconds) ? toRetrySeconds(seconds) : undefined
}

function secondsUntilHttpDate(value: string, now: number): number {
  return HTTP_DATE_LETTER.test(value) ? (Date.parse(value) - now) / MS_PER_SECOND : Number.NaN
}

function parseDecimal(value: string | null | undefined): number | undefined {
  const trimmed = value?.trim()
  return trimmed && DECIMAL_NUMBER.test(trimmed) ? Number(trimmed) : undefined
}

function toRetrySeconds(seconds: number): number {
  return Math.max(RETRY_AFTER_SECONDS_MIN, Math.ceil(seconds))
}
