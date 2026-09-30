import type { ApiErrorBody } from '@kb/contracts'

export type ApiErrorDetails = Pick<ApiErrorBody, 'errors' | 'retryAfter'>

export interface ErrorResponse {
  readonly status: number
  readonly body: ApiErrorBody
}
