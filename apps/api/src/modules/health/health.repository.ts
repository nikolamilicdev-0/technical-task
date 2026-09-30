import { Injectable } from '@nestjs/common'

import type { DatabaseClient } from '../../database/database-client.types.js'
import { DATABASE_FUNCTIONS } from '../../database/database.constants.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import { READINESS_TIMEOUT_MS } from './health.constants.js'

@Injectable()
export class HealthRepository {
  async embeddingColumnDimensions(db: DatabaseClient): Promise<number> {
    const { data, error, status } = await db
      .rpc(DATABASE_FUNCTIONS.embeddingColumnDimensions)
      .abortSignal(AbortSignal.timeout(READINESS_TIMEOUT_MS))
    if (error) throw new DatabaseRequestError(error, status)
    return data
  }
}
