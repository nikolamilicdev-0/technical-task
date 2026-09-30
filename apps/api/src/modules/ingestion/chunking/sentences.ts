import type { TextPiece } from './chunker.types.js'

// Whitespace after `.`, `!`, `?` or `…` (closing quotes and brackets may follow), or a line break;
// tried only where a whitespace run starts, so neither branch rescans a long run.
const SENTENCE_BOUNDARY = /((?<!\s)(?=\s)(?:(?<=[.!?…]["'’”)\]]*)\s+|\s*\n\s*))/

/** Sentences of prose, and its lines, so that lists and tables split between rows. */
export function splitSentences(text: string): TextPiece[] {
  return splitKeepingSeparators(text, SENTENCE_BOUNDARY)
}

/**
 * Splits at every match of `boundary`, whose whole pattern must be one capturing group; each piece
 * keeps the whitespace in front of it, so joining the pieces restores the text.
 */
export function splitKeepingSeparators(text: string, boundary: RegExp): TextPiece[] {
  const parts = text.split(boundary)
  const pieces: TextPiece[] = []
  for (let index = 0; index < parts.length; index += 2) {
    const piece = parts[index]
    if (piece !== '') pieces.push({ text: piece, separator: index === 0 ? '' : parts[index - 1] })
  }
  return pieces
}
