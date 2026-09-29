import { RETRY_BASE_DELAY_SECONDS, RETRY_MAX_DELAY_SECONDS } from './ingestion.constants.js'
import type { IngestionFailure } from './ingestion.types.js'

/** Seconds to wait after failed attempt `attempt` (from 1): 30, 60, 120, … at most 1800. */
export function retryDelaySeconds(attempt: number): number {
  const doublings = Math.max(0, attempt - 1)
  return Math.min(RETRY_BASE_DELAY_SECONDS * 2 ** doublings, RETRY_MAX_DELAY_SECONDS)
}

/**
 * When to try again, never sooner than the provider asked; null when the failure is permanent
 * or no attempt is left to claim.
 */
export function nextRetryInSeconds(
  { retryable, retryAfterSeconds = 0 }: Pick<IngestionFailure, 'retryable' | 'retryAfterSeconds'>,
  attempt: number,
  maxAttempts: number
): number | null {
  if (!retryable || attempt >= maxAttempts) return null
  return Math.max(retryDelaySeconds(attempt), Math.ceil(retryAfterSeconds))
}
