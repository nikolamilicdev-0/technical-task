import type { Database } from '../../database/database.types.js'

type Functions = Database['public']['Functions']

export type VectorHitRow = Functions['match_chunks']['Returns'][number]

export type KeywordHitRow = Functions['search_chunks_keyword']['Returns'][number]

export interface CandidateChunk {
  readonly chunkId: string
  readonly documentId: string
  readonly documentTitle: string
  readonly chunkIndex: number
  readonly content: string
  readonly headingPath: string
  readonly similarity?: number
  readonly keywordRank?: number
}

export interface RetrievedChunk extends CandidateChunk {
  readonly fusedScore: number
  /** 1-based position in each fused list, in list order; null where a list missed the chunk. */
  readonly ranks: readonly (number | null)[]
}

export interface FusionOptions {
  readonly k: number
  readonly limit: number
}

export interface RetrievalRequest {
  readonly query: string
  readonly embedding: readonly number[]
  readonly documentIds?: readonly string[]
}

/** Filters both searches share; RLS still decides which chunks the caller may see. */
export interface SearchScope {
  readonly signature: string
  readonly userId: string
  readonly documentIds?: readonly string[]
}

export interface VectorSearch extends SearchScope {
  readonly embedding: readonly number[]
  readonly matchCount: number
  readonly minSimilarity: number
}

export interface KeywordSearch extends SearchScope {
  readonly text: string
  readonly matchCount: number
}
