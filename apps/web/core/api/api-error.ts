import {
  apiErrorSchema,
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  type ErrorCode,
  type FieldErrors,
} from '@kb/contracts'

/** A request that never got a response: offline, DNS, CORS or the server down. */
const NETWORK_ERROR_STATUS = 0

const SERVER_ERROR_STATUS_MIN = 500
const CLIENT_ERROR_STATUS_MIN = 400
const MS_PER_SECOND = 1_000
const DELTA_SECONDS_PATTERN = /^\d+$/

export interface ApiErrorInit {
  status: number
  code: ErrorCode
  messages?: readonly string[]
  fieldErrors?: FieldErrors
  retryAfter?: number
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly messages: readonly string[]
  readonly fieldErrors: FieldErrors
  readonly retryAfter: number | undefined

  constructor({ status, code, messages = [], fieldErrors = {}, retryAfter }: ApiErrorInit) {
    super(messages[0] ?? code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.messages = messages
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
  }

  get isNetworkError(): boolean {
    return this.status === NETWORK_ERROR_STATUS
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** The resource does not exist, or row-level security hides it from this user. */
export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.code === 'not_found'
}

export function networkError(): ApiError {
  return new ApiError({ status: NETWORK_ERROR_STATUS, code: 'internal_error' })
}

export function parseErrorBody(
  status: number,
  body: unknown,
  retryAfterHeader?: string | null
): ApiError {
  const headerRetryAfter = parseRetryAfter(retryAfterHeader)
  const parsed = apiErrorSchema.safeParse(body)
  if (!parsed.success) {
    return new ApiError({ status, code: codeForStatus(status), retryAfter: headerRetryAfter })
  }
  return new ApiError({
    status,
    code: parsed.data.code,
    messages: parsed.data.messages,
    fieldErrors: parsed.data.errors,
    retryAfter: parsed.data.retryAfter ?? headerRetryAfter,
  })
}

export function isRetryableError(error: unknown): boolean {
  return isApiError(error) && (error.isNetworkError || error.status >= SERVER_ERROR_STATUS_MIN)
}

/** `Retry-After` as whole seconds; accepts delta-seconds or an HTTP date. */
export function parseRetryAfter(
  header: string | null | undefined,
  now: number = Date.now()
): number | undefined {
  if (!header) return undefined
  const trimmed = header.trim()
  if (DELTA_SECONDS_PATTERN.test(trimmed)) return Number(trimmed) || undefined
  const retryAt = Date.parse(trimmed)
  if (Number.isNaN(retryAt)) return undefined
  const seconds = Math.ceil((retryAt - now) / MS_PER_SECOND)
  return seconds > 0 ? seconds : undefined
}

// Only 4xx statuses borrow a contract code: a bare 502/503 (e.g. from a gateway) says nothing
// about the AI provider, so every other failure without a contracts body is `internal_error`.
function codeForStatus(status: number): ErrorCode {
  if (status < CLIENT_ERROR_STATUS_MIN || status >= SERVER_ERROR_STATUS_MIN) return 'internal_error'
  return ERROR_CODES.find((code) => ERROR_HTTP_STATUS[code] === status) ?? 'invalid_payload'
}
