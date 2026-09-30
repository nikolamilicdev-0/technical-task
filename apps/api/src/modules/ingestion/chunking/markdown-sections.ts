import type { CodeFence, MarkdownHeading, MarkdownSection } from './chunker.types.js'
import { fenceAfter } from './code-fences.js'

// CommonMark ATX heading: at most three spaces, one to six `#`, then whitespace or the line end.
const ATX_OPENING = /^ {0,3}(#{1,6})(?:[ \t]|$)/
const HASH = '#'
const BLANKS = new Set([' ', '\t'])

/**
 * Cuts Markdown at its ATX headings outside fenced code, which move into the breadcrumb. A section
 * without text is dropped unless no deeper heading follows it: then its heading text is its body.
 */
export function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = []
  const headings: MarkdownHeading[] = []
  let lines: string[] = []
  let fence: CodeFence | undefined
  for (const line of markdown.split('\n')) {
    const heading = fence === undefined ? parseHeading(line) : undefined
    if (heading === undefined) {
      fence = fenceAfter(line, fence)
      lines.push(line)
      continue
    }
    sections.push(toSection(headings, lines, heading))
    lines = []
    while ((headings.at(-1)?.level ?? 0) >= heading.level) headings.pop()
    headings.push(heading)
  }
  sections.push(toSection(headings, lines))
  return sections.filter((section) => section.body !== '')
}

// Sliced and trimmed, not matched with a lazy pattern that backtracks over long blank runs.
function parseHeading(line: string): MarkdownHeading | undefined {
  const match = ATX_OPENING.exec(line)
  if (match === null) return undefined
  const [opening, hashes = ''] = match
  return { level: hashes.length, text: withoutClosingSequence(line.slice(opening.length).trim()) }
}

// The optional closing `#` run must follow whitespace, so `C#` keeps its `#`.
function withoutClosingSequence(text: string): string {
  let end = text.length
  while (end > 0 && text[end - 1] === HASH) end -= 1
  if (end === text.length) return text
  if (end === 0) return ''
  return BLANKS.has(text[end - 1] ?? '') ? text.slice(0, end).trim() : text
}

function toSection(
  headings: readonly MarkdownHeading[],
  lines: readonly string[],
  next?: MarkdownHeading
): MarkdownSection {
  const body = lines.join('\n').trim()
  const last = headings.at(-1)
  const emptyLeaf = body === '' && last !== undefined && (next?.level ?? 0) <= last.level
  return {
    headingPath: headings.map((heading) => heading.text),
    body: emptyLeaf ? last.text : body,
  }
}
