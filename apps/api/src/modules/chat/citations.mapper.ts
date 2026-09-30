import type { Citation } from '@kb/contracts'

import { takeCodePoints } from '../../common/utils/text.js'
import type { RetrievalMode } from '../../config/app-config.types.js'
import type { RetrievedChunk } from '../retrieval/retrieval.types.js'
import { CITATION_EXCERPT_LENGTH } from './chat.constants.js'
import { parseCitations } from './citation-parser.js'

const WHITESPACE_RUN = /\s+/g

export function toCitations(sources: readonly RetrievedChunk[], mode: RetrievalMode): Citation[] {
  return sources.map((source, position) => ({
    index: position + 1,
    documentId: source.documentId,
    documentTitle: source.documentTitle,
    chunkId: source.chunkId,
    chunkIndex: source.chunkIndex,
    headingPath: source.headingPath,
    excerpt: toExcerpt(source.content),
    score: scoreOf(source, mode),
    cited: false,
  }))
}

export function markCited(citations: readonly Citation[], answer: string): Citation[] {
  const cited = new Set(parseCitations(answer, citations.length))
  return citations.map((citation) => ({ ...citation, cited: cited.has(citation.index) }))
}

export function toExcerpt(content: string): string {
  return takeCodePoints(content.replace(WHITESPACE_RUN, ' ').trim(), CITATION_EXCERPT_LENGTH)
}

// What the source was ranked by: the fused RRF score, or the cosine similarity in vector mode.
function scoreOf(source: RetrievedChunk, mode: RetrievalMode): number {
  return mode === 'vector' ? (source.similarity ?? source.fusedScore) : source.fusedScore
}
