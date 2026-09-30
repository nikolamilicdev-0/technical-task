import type { UsageSummary, UsageSummaryQuery } from '@kb/contracts'
import { Injectable } from '@nestjs/common'

import type { UserContext } from '../../database/user-context.types.js'
import { UsageRepository } from './usage.repository.js'
import { resolveUsageWindow } from './usage-window.js'

/** Token usage of the caller: totals, per day and per model. */
@Injectable()
export class UsageService {
  constructor(private readonly repository: UsageRepository) {}

  summary(user: UserContext, query: UsageSummaryQuery, now = new Date()): Promise<UsageSummary> {
    return this.repository.summary(user.db, resolveUsageWindow(query, now))
  }
}
