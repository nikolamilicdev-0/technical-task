import { Injectable } from '@nestjs/common'

import type { DatabaseClient } from '../../database/database-client.types.js'
import { DATABASE_FUNCTIONS } from '../../database/database.constants.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import {
  fromKeywordHit,
  fromVectorHit,
  toKeywordSearchArgs,
  toVectorSearchArgs,
} from './retrieval.mapper.js'
import type { CandidateChunk, KeywordSearch, VectorSearch } from './retrieval.types.js'

@Injectable()
export class RetrievalRepository {
  async matchChunks(db: DatabaseClient, search: VectorSearch): Promise<CandidateChunk[]> {
    const { data, error, status } = await db.rpc(
      DATABASE_FUNCTIONS.matchChunks,
      toVectorSearchArgs(search)
    )
    if (error) throw new DatabaseRequestError(error, status)
    return data.map(fromVectorHit)
  }

  async searchKeyword(db: DatabaseClient, search: KeywordSearch): Promise<CandidateChunk[]> {
    const { data, error, status } = await db.rpc(
      DATABASE_FUNCTIONS.searchChunksKeyword,
      toKeywordSearchArgs(search)
    )
    if (error) throw new DatabaseRequestError(error, status)
    return data.map(fromKeywordHit)
  }
}
