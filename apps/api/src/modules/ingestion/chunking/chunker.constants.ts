import type { ChunkingOptions } from './chunker.types.js'

// Token budgets per chunk, in cl100k tokens (DEC-006); change them only together with the chunker tests.
export const CHUNK_TARGET_TOKENS = 400
export const CHUNK_MAX_TOKENS = 512
export const CHUNK_OVERLAP_TOKENS = 50
export const CHUNK_MIN_TAIL_TOKENS = 60

export const HEADING_SEPARATOR = ' › '

export const MAX_HEADING_LENGTH = 80
export const TRUNCATION_MARK = '…'

export const MAX_BREADCRUMB_TOKENS = 64

export const MAX_BLANK_RUN_LENGTH = 64

export const MAX_CHUNKS_PER_DOCUMENT = 1000

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  targetTokens: CHUNK_TARGET_TOKENS,
  maxTokens: CHUNK_MAX_TOKENS,
  overlapTokens: CHUNK_OVERLAP_TOKENS,
  minTailTokens: CHUNK_MIN_TAIL_TOKENS,
}

export const BLOCK_SEPARATOR = '\n\n'

export const EMBEDDING_INPUT_SEPARATOR = '\n\n'
