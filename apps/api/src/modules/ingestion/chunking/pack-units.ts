import type { TokenCounting } from '../../../ai/token-counter.types.js'
import type { ChunkingOptions, ChunkUnit, PackedChunk, TextPiece } from './chunker.types.js'

// Tokens merge only across the join, so a unit's opening characters decide what its separator adds.
const JOIN_PROBE_LENGTH = 32

/** A piece with its token count and the tokens its separator adds in front of it. */
export function toChunkUnit(piece: TextPiece, counter: TokenCounting): ChunkUnit {
  return { ...piece, tokens: counter.count(piece.text), joinTokens: joinTokens(piece, counter) }
}

/**
 * Packs a section's units greedily into chunks of `targetTokens` (a bigger unit stands alone), each
 * opening with up to `overlapTokens` of the last; a tiny tail joins the chunk before if it fits.
 */
export function packUnits(
  units: readonly ChunkUnit[],
  options: ChunkingOptions,
  counter: TokenCounting
): string[] {
  const chunks: PackedChunk[] = []
  let current: ChunkUnit[] = []
  let carried = 0
  for (const unit of units) {
    if (current.length === 0 || estimateTokens([...current, unit]) <= options.targetTokens) {
      current.push(unit)
      continue
    }
    chunks.push({ units: current, carried })
    const overlap = trailingOverlap(current, options.overlapTokens)
    const keepsOverlap =
      overlap.length > 0 && estimateTokens([...overlap, unit]) <= options.targetTokens
    current = keepsOverlap ? [...overlap, unit] : [unit]
    carried = keepsOverlap ? overlap.length : 0
  }
  if (current.length > 0) chunks.push({ units: current, carried })
  return mergeTinyTail(chunks, options, counter).map((chunk) => joinUnits(chunk.units))
}

/** The units' text with each unit's own separator in front of every unit but the first. */
export function joinUnits(units: readonly ChunkUnit[]): string {
  return units.map((unit, index) => (index === 0 ? unit.text : unit.separator + unit.text)).join('')
}

// A unit's last token may still merge with the next separator, so the estimate errs large.
function estimateTokens(units: readonly ChunkUnit[]): number {
  return units.reduce(
    (tokens, unit, index) => tokens + unit.tokens + (index === 0 ? 0 : unit.joinTokens),
    0
  )
}

// Never the whole chunk: the next one has to move the text forward.
function trailingOverlap(units: readonly ChunkUnit[], overlapTokens: number): ChunkUnit[] {
  let start = units.length
  while (start > 1 && estimateTokens(units.slice(start - 1)) <= overlapTokens) start -= 1
  return units.slice(start)
}

function joinTokens({ text, separator }: TextPiece, counter: TokenCounting): number {
  if (separator === '') return 0
  const probe = text.slice(0, JOIN_PROBE_LENGTH)
  return Math.max(0, counter.count(separator + probe) - counter.count(probe))
}

function mergeTinyTail(
  chunks: readonly PackedChunk[],
  options: ChunkingOptions,
  counter: TokenCounting
): readonly PackedChunk[] {
  const tail = chunks.at(-1)
  const previous = chunks.at(-2)
  if (tail === undefined || previous === undefined) return chunks
  const fresh = tail.units.slice(tail.carried)
  if (estimateTokens(fresh) >= options.minTailTokens) return chunks
  // The overlap already ends the previous chunk, so only the tail's new units are appended.
  const merged = [...previous.units, ...fresh]
  if (counter.count(joinUnits(merged)) > options.maxTokens) return chunks
  return [...chunks.slice(0, -2), { units: merged, carried: previous.carried }]
}
