import type { ApiErrorBody } from '@kb/contracts'

/** The optional parts of an error body. */
export type ApiErrorDetails = Pick<ApiErrorBody, 'errors' | 'retryAfter'>

/** What the exception filter sends: the contract status for the body's code, and the body. */
export interface ErrorResponse {
  readonly status: number
  readonly body: ApiErrorBody
}
