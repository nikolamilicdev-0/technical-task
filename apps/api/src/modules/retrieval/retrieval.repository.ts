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

/** The search SQL functions through the caller's client: RLS limits them to their chunks (DEC-004). */
@Injectable()
export class RetrievalRepository {
  /** Nearest chunks by cosine similarity, most similar first. */
  async matchChunks(db: DatabaseClient, search: VectorSearch): Promise<CandidateChunk[]> {
    const { data, error, status } = await db.rpc(
      DATABASE_FUNCTIONS.matchChunks,
      toVectorSearchArgs(search)
    )
    if (error) throw new DatabaseRequestError(error, status)
    return data.map(fromVectorHit)
  }

  /** Full-text matches (`websearch_to_tsquery`), best `ts_rank_cd` first. */
  async searchKeyword(db: DatabaseClient, search: KeywordSearch): Promise<CandidateChunk[]> {
    const { data, error, status } = await db.rpc(
      DATABASE_FUNCTIONS.searchChunksKeyword,
      toKeywordSearchArgs(search)
    )
    if (error) throw new DatabaseRequestError(error, status)
    return data.map(fromKeywordHit)
  }
}
