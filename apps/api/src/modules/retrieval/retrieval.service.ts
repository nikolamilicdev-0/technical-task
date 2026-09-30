import type { EmbeddingModel } from '@kb/ai'
import { Inject, Injectable, Logger } from '@nestjs/common'

import { EMBEDDING_MODEL } from '../../ai/ai.constants.js'
import type { AppConfig, RagSettings, RetrievalMode } from '../../config/app-config.types.js'
import { APP_CONFIG } from '../../config/config.constants.js'
import type { UserContext } from '../../database/user-context.types.js'
import { fuseRankings } from './rank-fusion.js'
import { KEYWORD_LIST, MISSING_RANK, VECTOR_LIST } from './retrieval.constants.js'
import { RetrievalRepository } from './retrieval.repository.js'
import type {
  CandidateChunk,
  RetrievalRequest,
  RetrievedChunk,
  SearchScope,
} from './retrieval.types.js'

const NO_HITS: readonly CandidateChunk[] = []

@Injectable()
export class RetrievalService {
  readonly #logger = new Logger(RetrievalService.name)
  readonly #settings: RagSettings

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(EMBEDDING_MODEL) private readonly embedding: EmbeddingModel,
    private readonly repository: RetrievalRepository
  ) {
    this.#settings = config.rag
  }

  get mode(): RetrievalMode {
    return this.#settings.retrievalMode
  }

  async retrieve(
    user: UserContext,
    { query, embedding, documentIds }: RetrievalRequest
  ): Promise<RetrievedChunk[]> {
    const { vectorK, keywordK, minSimilarity, rrfK, topN } = this.#settings
    const scope: SearchScope = {
      signature: this.embedding.signature,
      userId: user.userId,
      documentIds,
    }
    const [vectorHits, keywordHits] = await Promise.all([
      this.repository.matchChunks(user.db, {
        ...scope,
        embedding,
        matchCount: vectorK,
        minSimilarity,
      }),
      this.mode === 'hybrid'
        ? this.repository.searchKeyword(user.db, { ...scope, text: query, matchCount: keywordK })
        : NO_HITS,
    ])
    const chunks = fuseRankings([vectorHits, keywordHits], { k: rrfK, limit: topN })
    this.#logger.debug(
      `Fused ${vectorHits.length} vector and ${keywordHits.length} keyword hits into ` +
        `${chunks.length} [${this.mode}]: ${chunks.map(describeChunk).join(', ')}`
    )
    return chunks
  }
}

// Ids, not titles or text: the log shows why a chunk won without copying the user's content.
function describeChunk({ documentId, chunkIndex, ranks, fusedScore }: RetrievedChunk): string {
  const vector = ranks[VECTOR_LIST] ?? MISSING_RANK
  const keyword = ranks[KEYWORD_LIST] ?? MISSING_RANK
  return `${documentId}#${chunkIndex} v${vector} k${keyword} ${fusedScore.toFixed(4)}`
}
