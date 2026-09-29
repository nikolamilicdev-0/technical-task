import { Injectable } from '@nestjs/common'

import type { DatabaseClient } from '../../database/database-client.types.js'
import { DATABASE_FUNCTIONS } from '../../database/database.constants.js'
import { READINESS_TIMEOUT_MS } from './health.constants.js'

@Injectable()
export class HealthRepository {
  /** Declared size of `document_chunks.embedding`; throws when the database does not answer in time. */
  async embeddingColumnDimensions(db: DatabaseClient): Promise<number> {
    const { data, error } = await db
      .rpc(DATABASE_FUNCTIONS.embeddingColumnDimensions)
      .abortSignal(AbortSignal.timeout(READINESS_TIMEOUT_MS))
    if (error) throw error
    return data
  }
}
