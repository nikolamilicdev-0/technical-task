import type { DatabaseClient } from '../../src/database/database-client.types.js'
import type { RetrievalRepository } from '../../src/modules/retrieval/retrieval.repository.js'
import type {
  CandidateChunk,
  KeywordSearch,
  VectorSearch,
} from '../../src/modules/retrieval/retrieval.types.js'

type RetrievalStore = Pick<RetrievalRepository, keyof RetrievalRepository>

/** Answers every search with scripted hits and records what was asked. */
export class ScriptedRetrievalRepository implements RetrievalStore {
  vectorHits: CandidateChunk[] = []
  keywordHits: CandidateChunk[] = []
  readonly vectorSearches: VectorSearch[] = []
  readonly keywordSearches: KeywordSearch[] = []

  async matchChunks(_db: DatabaseClient, search: VectorSearch): Promise<CandidateChunk[]> {
    this.vectorSearches.push(search)
    return this.vectorHits
  }

  async searchKeyword(_db: DatabaseClient, search: KeywordSearch): Promise<CandidateChunk[]> {
    this.keywordSearches.push(search)
    return this.keywordHits
  }
}
