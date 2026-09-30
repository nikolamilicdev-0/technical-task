export const RATE_LIMIT_WINDOW_MS = 60_000
export const DEFAULT_THROTTLER = 'default'
export const MIN_RETRY_AFTER_SECONDS = 1

export const RATE_LIMIT_BUCKETS = ['chat'] as const
export const RATE_LIMIT_BUCKET_KEY = 'throttling:bucket'
