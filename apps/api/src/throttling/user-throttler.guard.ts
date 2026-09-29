import { type ExecutionContext, Injectable } from '@nestjs/common'
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler'

import { ApiHttpException } from '../common/errors/api-http.exception.js'
import { DEFAULT_ERROR_MESSAGES } from '../common/errors/error.constants.js'
import type { ApiRequest } from '../common/types/request.types.js'
import { MIN_RETRY_AFTER_SECONDS } from './throttling.constants.js'

/** Rate-limits per signed-in user, so it must run after the AuthGuard has identified them. */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(request: ApiRequest): Promise<string> {
    return request.userContext?.userId ?? super.getTracker(request)
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
