import type { ChunkingOptions } from './chunker.types.js'

// Token budgets per chunk, in cl100k tokens (DEC-006); change them only together with the chunker tests.
export const CHUNK_TARGET_TOKENS = 400
export const CHUNK_MAX_TOKENS = 512
export const CHUNK_OVERLAP_TOKENS = 50
export const CHUNK_MIN_TAIL_TOKENS = 60

/** Joins the document title and the headings above a passage: `Title › Setup › Linux`. */
export const HEADING_SEPARATOR = ' › '

/** A document that splits into more chunks fails for good: too slow and costly to embed. */
export const MAX_CHUNKS_PER_DOCUMENT = 1000

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  targetTokens: CHUNK_TARGET_TOKENS,
  maxTokens: CHUNK_MAX_TOKENS,
  overlapTokens: CHUNK_OVERLAP_TOKENS,
  minTailTokens: CHUNK_MIN_TAIL_TOKENS,
}

/** Precedes a unit that starts a new block (paragraph, list, table or code block). */
export const BLOCK_SEPARATOR = '\n\n'

/** Between the breadcrumb and the content of the text that gets embedded. */
export const EMBEDDING_INPUT_SEPARATOR = '\n\n'
