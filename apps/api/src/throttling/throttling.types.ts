import type { RATE_LIMIT_BUCKETS } from './throttling.constants.js'

export type RateLimitBucketName = (typeof RATE_LIMIT_BUCKETS)[number]
