import { type ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
  type ThrottlerRequest,
  type ThrottlerStorage,
} from '@nestjs/throttler'

import { ApiHttpException } from '../common/errors/api-http.exception.js'
import { DEFAULT_ERROR_MESSAGES } from '../common/errors/error.constants.js'
import type { ApiRequest } from '../common/types/request.types.js'
import type { AppConfig } from '../config/app-config.types.js'
import { APP_CONFIG } from '../config/config.constants.js'
import { MIN_RETRY_AFTER_SECONDS, RATE_LIMIT_BUCKET_KEY } from './throttling.constants.js'
import type { RateLimitBucketName } from './throttling.types.js'

/** Rate-limits per signed-in user, so it must run after the AuthGuard has identified them. */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  readonly #bucketLimits: Readonly<Record<RateLimitBucketName, number>>

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    @Inject(APP_CONFIG) config: AppConfig
  ) {
    super(options, storage, reflector)
    this.#bucketLimits = { chat: config.rateLimit.chatPerMinute }
  }

  protected override async getTracker(request: ApiRequest): Promise<string> {
    return request.userContext?.userId ?? super.getTracker(request)
  }

  // A `@RateLimitBucket` route swaps in its configured limit; window and counting stay the same.
  protected override async handleRequest(request: ThrottlerRequest): Promise<boolean> {
    const { context } = request
    const bucket = this.reflector.getAllAndOverride<RateLimitBucketName | undefined>(
      RATE_LIMIT_BUCKET_KEY,
      [context.getHandler(), context.getClass()]
    )
    const limit = bucket === undefined ? request.limit : this.#bucketLimits[bucket]
    return super.handleRequest({ ...request, limit })
  }

  // The base guard has already set `Retry-After`; the body repeats it as `retryAfter`.
  protected override async throwThrottlingException(
    _context: ExecutionContext,
    { timeToBlockExpire }: ThrottlerLimitDetail
  ): Promise<void> {
    const retryAfter = Math.max(MIN_RETRY_AFTER_SECONDS, Math.ceil(timeToBlockExpire))
    throw new ApiHttpException('rate_limited', [DEFAULT_ERROR_MESSAGES.rate_limited], {
      retryAfter,
    })
  }
}
