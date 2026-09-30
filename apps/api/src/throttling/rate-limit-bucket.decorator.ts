import { SetMetadata } from '@nestjs/common'

import { RATE_LIMIT_BUCKET_KEY } from './throttling.constants.js'
import type { RateLimitBucketName } from './throttling.types.js'

/** Limits a route by a configured bucket; `@Throttle` cannot read DI configuration. */
export const RateLimitBucket = (bucket: RateLimitBucketName) =>
  SetMetadata(RATE_LIMIT_BUCKET_KEY, bucket)
