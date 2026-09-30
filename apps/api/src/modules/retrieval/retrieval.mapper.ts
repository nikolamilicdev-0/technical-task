import { toStoredVector } from '../../common/utils/vector.js'
import type { Database } from '../../database/database.types.js'
import type {
  CandidateChunk,
  KeywordHitRow,
  KeywordSearch,
  SearchScope,
  VectorHitRow,
  VectorSearch,
} from './retrieval.types.js'

type Functions = Database['public']['Functions']

export function toVectorSearchArgs(search: VectorSearch): Functions['match_chunks']['Args'] {
  return {
    p_query_embedding: toStoredVector(search.embedding),
    p_embedding_model: search.signature,
    p_match_count: search.matchCount,
    p_min_similarity: search.minSimilarity,
    ...scopeArgs(search),
  }
}

export function toKeywordSearchArgs(
  search: KeywordSearch
): Functions['search_chunks_keyword']['Args'] {
  return {
    p_query_text: search.text,
    p_embedding_model: search.signature,
    p_match_count: search.matchCount,
    ...scopeArgs(search),
  }
}

export function fromVectorHit(row: VectorHitRow): CandidateChunk {
  return { ...toChunk(row), similarity: row.similarity }
}

export function fromKeywordHit(row: KeywordHitRow): CandidateChunk {
  return { ...toChunk(row), keywordRank: row.keyword_rank }
}

// No `p_document_ids` means every document: the SQL default is null, not an empty array.
function scopeArgs({ userId, documentIds }: SearchScope) {
  return {
    p_user_id: userId,
    ...(documentIds === undefined ? {} : { p_document_ids: [...documentIds] }),
  }
}

function toChunk(row: VectorHitRow | KeywordHitRow): CandidateChunk {
  return {
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    chunkIndex: row.chunk_index,
    content: row.content,
    headingPath: row.heading_path,
  }
}
