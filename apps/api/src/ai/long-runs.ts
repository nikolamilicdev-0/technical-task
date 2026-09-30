import { splitsSurrogatePair } from '../common/utils/text.js'

/** Longest run of one character class that the token counter encodes in one piece. */
export const MAX_ENCODED_RUN_LENGTH = 32

// cl100k keeps a run of whitespace, letters or other symbols in one piece (digits come in threes),
// and js-tiktoken merges the byte pairs of one piece in quadratic time.
const RUN_CLASSES = [String.raw`\s`, String.raw`\p{L}`, String.raw`[^\s\p{L}\p{N}]`]
// A run matches only from its first character, so the scan stays linear.
const LONG_RUN = new RegExp(
  RUN_CLASSES.map((run) => `(?<!${run})${run}{${MAX_ENCODED_RUN_LENGTH + 1},}`).join('|'),
  'gu'
)

/** Cuts every longer run every MAX_ENCODED_RUN_LENGTH code units; the slices join into `text`. */
export function sliceLongRuns(text: string): string[] {
  const slices: string[] = []
  let start = 0
  for (const match of text.matchAll(LONG_RUN)) {
    const end = match.index + match[0].length
    for (let cut = nextCut(text, match.index); cut < end; cut = nextCut(text, cut)) {
      slices.push(text.slice(start, cut))
      start = cut
    }
  }
  slices.push(text.slice(start))
  return slices
}

function nextCut(text: string, from: number): number {
  const cut = from + MAX_ENCODED_RUN_LENGTH
  return splitsSurrogatePair(text, cut) ? cut + 1 : cut
}
