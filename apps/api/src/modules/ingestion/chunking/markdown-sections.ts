import type { CodeFence, MarkdownHeading, MarkdownSection } from './chunker.types.js'
import { fenceAfter } from './code-fences.js'

// CommonMark ATX heading: at most three spaces, one to six `#`, then whitespace or the line end.
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/
// The optional closing `#` run must follow whitespace, so `C#` keeps its `#`.
const CLOSING_SEQUENCE = /(?:^|[ \t]+)#+$/

/**
 * Cuts Markdown at its ATX headings, whose lines move into the breadcrumb; a `#` line inside a
 * fenced code block stays code. Sections without text are dropped.
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
    sections.push(toSection(headings, lines))
    lines = []
    while ((headings.at(-1)?.level ?? 0) >= heading.level) headings.pop()
    headings.push(heading)
  }
  sections.push(toSection(headings, lines))
  return sections.filter((section) => section.body !== '')
}

function parseHeading(line: string): MarkdownHeading | undefined {
  const match = ATX_HEADING.exec(line)
  if (match === null) return undefined
  const [, hashes = '', text = ''] = match
  return { level: hashes.length, text: text.replace(CLOSING_SEQUENCE, '').trim() }
}

function toSection(
  headings: readonly MarkdownHeading[],
  lines: readonly string[]
): MarkdownSection {
  return { headingPath: headings.map((heading) => heading.text), body: lines.join('\n').trim() }
}
