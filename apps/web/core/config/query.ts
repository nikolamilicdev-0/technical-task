/** Cached server data counts as fresh for this long before a background refetch. */
export const STALE_TIME_MS = 30_000

/** Poll interval while any document is still being indexed. */
export const INDEXING_POLL_INTERVAL_MS = 3_000

/** Extra attempts for network and 5xx failures; 4xx responses are never retried. */
export const RETRY_COUNT = 2
