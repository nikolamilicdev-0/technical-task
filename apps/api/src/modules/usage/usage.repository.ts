import type { UsageSummary } from '@kb/contracts'
import { Injectable } from '@nestjs/common'

import type { DatabaseClient } from '../../database/database-client.types.js'
import { DATABASE_FUNCTIONS } from '../../database/database.constants.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import { toUsageSummary } from './usage.mapper.js'
import type { UsageWindow } from './usage.types.js'

@Injectable()
export class UsageRepository {
  async summary(db: DatabaseClient, { from, to, timezone }: UsageWindow): Promise<UsageSummary> {
    const { data, error, status } = await db.rpc(DATABASE_FUNCTIONS.usageSummary, {
      p_from: from,
      p_to: to,
      p_timezone: timezone,
    })
    if (error) throw new DatabaseRequestError(error, status)
    return toUsageSummary(data)
  }
}
