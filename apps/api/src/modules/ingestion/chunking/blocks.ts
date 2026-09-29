import type { CodeFence, MarkdownBlock, MarkdownBlockKind, TextPiece } from './chunker.types.js'
import { closesFence, openingFence } from './code-fences.js'
import { splitKeepingSeparators } from './sentences.js'

const BLANK_LINE = /^\s*$/
const LINE_BREAKS = /(\n+)/

/** Blank lines separate blocks; a fenced code block is one block, blank lines included. */
export function splitBlocks(body: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let lines: string[] = []
  let fence: CodeFence | undefined
  const flush = (kind: MarkdownBlockKind): void => {
    if (lines.length > 0) blocks.push({ kind, text: lines.join('\n') })
    lines = []
  }
  for (const line of body.split('\n')) {
    if (fence !== undefined) {
      lines.push(line)
      if (closesFence(line, fence)) {
        flush('code')
        fence = undefined
      }
      continue
    }
    fence = openingFence(line)
    const blank = BLANK_LINE.test(line)
    if (fence !== undefined || blank) flush('prose')
    if (!blank) lines.push(line)
  }
  // An unclosed fence runs to the end of the section, as in CommonMark.
  flush(fence === undefined ? 'prose' : 'code')
  return blocks
}

/** The lines of a code block; blank lines stay in the separators, so joining restores the code. */
export function splitCodeLines(code: string): TextPiece[] {
  return splitKeepingSeparators(code, LINE_BREAKS)
}
