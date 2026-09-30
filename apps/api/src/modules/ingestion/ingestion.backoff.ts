import {
  MAX_RETRY_IN_SECONDS,
  RETRY_BASE_DELAY_SECONDS,
  RETRY_MAX_DELAY_SECONDS,
} from './ingestion.constants.js'
import type { IngestionFailure } from './ingestion.types.js'

export function retryDelaySeconds(attempt: number): number {
  const doublings = Math.max(0, attempt - 1)
  return Math.min(RETRY_BASE_DELAY_SECONDS * 2 ** doublings, RETRY_MAX_DELAY_SECONDS)
}

export function nextRetryInSeconds(
  { retryable, retryAfterSeconds = 0 }: Pick<IngestionFailure, 'retryable' | 'retryAfterSeconds'>,
  attempt: number,
  maxAttempts: number
): number | null {
  if (!retryable || attempt >= maxAttempts) return null
  const requested = Math.min(Math.ceil(retryAfterSeconds), MAX_RETRY_IN_SECONDS)
  return Math.max(retryDelaySeconds(attempt), requested)
}
