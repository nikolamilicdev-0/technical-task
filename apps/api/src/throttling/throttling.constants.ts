/** Limits count requests per user (per IP on public routes) and per route in one-minute windows. */
export const RATE_LIMIT_WINDOW_MS = 60_000
export const DEFAULT_THROTTLER = 'default'
export const MIN_RETRY_AFTER_SECONDS = 1
