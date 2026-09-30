import {
  UNKNOWN_TIME_ZONE_MESSAGE,
  USAGE_WINDOW_MESSAGE,
  type UsageSummary,
  type UsageSummaryQuery,
} from '@kb/contracts'
import { Injectable } from '@nestjs/common'

import { ApiHttpException } from '../../common/errors/api-http.exception.js'
import { DEFAULT_ERROR_MESSAGES } from '../../common/errors/error.constants.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import type { UserContext } from '../../database/user-context.types.js'
import { UsageRepository } from './usage.repository.js'
import { resolveUsageWindow } from './usage-window.js'

// Postgres raises it for a time zone missing from its own tzdata, even one `Intl` accepts.
const INVALID_PARAMETER_VALUE = '22023'

@Injectable()
export class UsageService {
  constructor(private readonly repository: UsageRepository) {}

  async summary(
    user: UserContext,
    query: UsageSummaryQuery,
    now = new Date()
  ): Promise<UsageSummary> {
    const window = resolveUsageWindow(query, now)
    // The contract compares `from` and `to` only when both are given; `to` defaults to now.
    if (Date.parse(window.from) >= Date.parse(window.to)) {
      throw invalidQuery('from', USAGE_WINDOW_MESSAGE)
    }
    try {
      return await this.repository.summary(user.db, window)
    } catch (error) {
      if (error instanceof DatabaseRequestError && error.code === INVALID_PARAMETER_VALUE) {
        throw invalidQuery('timezone', UNKNOWN_TIME_ZONE_MESSAGE)
      }
      throw error
    }
  }
}

function invalidQuery(field: string, message: string): ApiHttpException {
  return new ApiHttpException('invalid_payload', [DEFAULT_ERROR_MESSAGES.invalid_payload], {
    errors: { [field]: [message] },
  })
}
