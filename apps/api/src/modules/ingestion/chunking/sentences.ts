import type { TextPiece } from './chunker.types.js'

// Whitespace after `.`, `!`, `?` or `…` (closing quotes and brackets may follow), or a line break;
// tried only where a whitespace run starts, so neither branch rescans a long run.
const SENTENCE_BOUNDARY = /((?<!\s)(?=\s)(?:(?<=[.!?…]["'’”)\]]*)\s+|\s*\n\s*))/

export function splitSentences(text: string): TextPiece[] {
  return splitKeepingSeparators(text, SENTENCE_BOUNDARY)
}

/** `boundary` must be one capturing group around its whole pattern. */
export function splitKeepingSeparators(text: string, boundary: RegExp): TextPiece[] {
  const parts = text.split(boundary)
  const pieces: TextPiece[] = []
  for (let index = 0; index < parts.length; index += 2) {
    const piece = parts[index]
    if (piece !== '') pieces.push({ text: piece, separator: index === 0 ? '' : parts[index - 1] })
  }
  return pieces
}
