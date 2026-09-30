import type { Database } from '../../database/database.types.js'

type Functions = Database['public']['Functions']

/** A `match_chunks` row: the chunk and its cosine similarity to the query. */
export type VectorHitRow = Functions['match_chunks']['Returns'][number]

/** A `search_chunks_keyword` row: the chunk and its full-text `ts_rank_cd`. */
export type KeywordHitRow = Functions['search_chunks_keyword']['Returns'][number]

/** A chunk as one ranked search list returned it; only that list's score is set. */
export interface CandidateChunk {
  readonly chunkId: string
  readonly documentId: string
  readonly documentTitle: string
  readonly chunkIndex: number
  readonly content: string
  /** The title and the headings above the passage: `Title › Setup › Linux`. */
  readonly headingPath: string
  /** Cosine similarity to the query embedding; set by vector search. */
  readonly similarity?: number
  /** `ts_rank_cd` of the full-text match; set by keyword search. */
  readonly keywordRank?: number
}

/** A chunk after Reciprocal Rank Fusion, best first. */
export interface RetrievedChunk extends CandidateChunk {
  /** Σ 1 / (k + rank) over the lists that returned the chunk. */
  readonly fusedScore: number
  /** 1-based position in each fused list, in list order; null where a list missed the chunk. */
  readonly ranks: readonly (number | null)[]
}

/** Reciprocal Rank Fusion knobs: the rank constant and how many fused chunks to keep. */
export interface FusionOptions {
  readonly k: number
  readonly limit: number
}

/** What to retrieve for: the query text, its embedding and an optional document scope. */
export interface RetrievalRequest {
  readonly query: string
  readonly embedding: readonly number[]
  /** Restricts the search to these documents; unset searches all of the caller's documents. */
  readonly documentIds?: readonly string[]
}

/** Filters both searches share; RLS still decides which chunks the caller may see. */
export interface SearchScope {
  /** Embedding model signature: only chunks from the same vector space match (DEC-014). */
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
