import type { CandidateChunk, FusionOptions, RetrievedChunk } from './retrieval.types.js'

interface FusionEntry {
  chunk: CandidateChunk
  fusedScore: number
  readonly ranks: (number | null)[]
}

// Reciprocal Rank Fusion (Cormack et al., 2009): each list adds 1 / (k + rank), ranks from 1.
// Lists are best first; ties go to the higher vector similarity, then to the lower chunk id.
export function fuseRankings(
  lists: readonly (readonly CandidateChunk[])[],
  { k, limit }: FusionOptions
): RetrievedChunk[] {
  if (!Number.isFinite(k) || k < 0) throw new RangeError(`k must be a number ≥ 0, got ${k}`)
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be a positive integer, got ${limit}`)
  }
  const entries = new Map<string, FusionEntry>()
  lists.forEach((list, listIndex) => {
    for (const [position, candidate] of distinctChunks(list).entries()) {
      const rank = position + 1
      const entry = entries.get(candidate.chunkId) ?? newEntry(candidate, lists.length)
      entry.chunk = mergeScores(entry.chunk, candidate)
      entry.fusedScore += 1 / (k + rank)
      entry.ranks[listIndex] = rank
      entries.set(candidate.chunkId, entry)
    }
  })
  return [...entries.values()].map(toRetrievedChunk).sort(compareFused).slice(0, limit)
}

function distinctChunks(list: readonly CandidateChunk[]): CandidateChunk[] {
  const seen = new Set<string>()
  return list.filter(({ chunkId }) => {
    if (seen.has(chunkId)) return false
    seen.add(chunkId)
    return true
  })
}

function newEntry(chunk: CandidateChunk, listCount: number): FusionEntry {
  return { chunk, fusedScore: 0, ranks: new Array<number | null>(listCount).fill(null) }
}

function mergeScores(current: CandidateChunk, next: CandidateChunk): CandidateChunk {
  return {
    ...current,
    similarity: current.similarity ?? next.similarity,
    keywordRank: current.keywordRank ?? next.keywordRank,
  }
}

function toRetrievedChunk({ chunk, fusedScore, ranks }: FusionEntry): RetrievedChunk {
  return { ...chunk, fusedScore, ranks }
}

function compareFused(a: RetrievedChunk, b: RetrievedChunk): number {
  if (a.fusedScore !== b.fusedScore) return b.fusedScore - a.fusedScore
  const similarityA = a.similarity ?? Number.NEGATIVE_INFINITY
  const similarityB = b.similarity ?? Number.NEGATIVE_INFINITY
  if (similarityA !== similarityB) return similarityB > similarityA ? 1 : -1
  if (a.chunkId === b.chunkId) return 0
  return a.chunkId < b.chunkId ? -1 : 1
}
