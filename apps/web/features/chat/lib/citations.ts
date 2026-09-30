import type { Citation } from '@kb/contracts'

import { toPlainPreview } from '@/features/documents/lib/to-plain-preview'

const CITATION_HREF_PREFIX = '#cite-'
// Excerpts arrive on one line, so heading markers sit mid-line where line-start rules miss them.
const INLINE_HEADING_MARKER = /(^|\s)#{1,6}\s+/g
const CITATION_HREF = /^#cite-(\d+)$/
// `[1]`, `[1, 2]`; not a link (`[1](url)`), a definition (`[1]: url`), an image or escaped.
const CITATION_MARKER = /(?<![\\!])\[(\s*\d+\s*(?:,\s*\d+\s*)*)\](?![(:])/g
const MARKER_SEPARATOR = ','
// The ingestion chunker's breadcrumb separator (`Title › Setup › Linux`).
const HEADING_SEPARATOR = ' › '
// Fenced blocks (to their closing fence, or the end while one streams in) and inline code.
const CODE = /(`{3,}|~{3,})[\s\S]*?(?:\1|$)|`[^`\n]*`/g

interface MarkdownSegment {
  text: string
  code: boolean
}

export function citationHref(index: number): string {
  return `${CITATION_HREF_PREFIX}${index}`
}

/** The source number of a `#cite-n` link, or null for any other href. */
export function parseCitationHref(href: string | undefined): number | null {
  const match = href ? CITATION_HREF.exec(href) : null
  return match ? Number(match[1]) : null
}

/**
 * Rewrites the answer's `[n]` markers into `[n](#cite-n)` links so Markdown renders them as
 * chips. `[n]` refers to `citations[n - 1]`; numbers without a source and code stay as written.
 */
export function linkifyCitations(markdown: string, sourceCount: number): string {
  if (sourceCount === 0) return markdown
  return splitCode(markdown)
    .map(({ text, code }) =>
      code
        ? text
        : text.replace(CITATION_MARKER, (marker, list: string) => {
            const links = citedIn(list, sourceCount).map(
              (index) => `[${index}](${citationHref(index)})`
            )
            return links.length > 0 ? links.join('') : marker
          })
    )
    .join('')
}

/** The citations with `cited` set exactly for the sources the answer's markers name. */
export function markCited(citations: readonly Citation[], answer: string): Citation[] {
  const cited = new Set(
    splitCode(answer)
      .filter(({ code }) => !code)
      .flatMap(({ text }) =>
        Array.from(text.matchAll(CITATION_MARKER), ([, list = '']) =>
          citedIn(list, citations.length)
        ).flat()
      )
  )
  return citations.map((citation) => ({ ...citation, cited: cited.has(citation.index) }))
}

/**
 * The headings above the cited passage, without the document title the breadcrumb starts with
 * (`Guide › Setup › Linux` → `Setup › Linux`); null for a passage above the first heading.
 */
export function sectionPath({ headingPath, documentTitle }: Citation): string | null {
  const titlePrefix = `${documentTitle}${HEADING_SEPARATOR}`
  if (headingPath.startsWith(titlePrefix)) return headingPath.slice(titlePrefix.length) || null
  return headingPath === documentTitle || headingPath === '' ? null : headingPath
}

/** A source's excerpt as plain text, without the Markdown syntax of the passage it quotes. */
export function toPlainExcerpt(excerpt: string): string {
  return toPlainPreview(excerpt.replace(INLINE_HEADING_MARKER, '$1'))
}

/** The best retrieval score among a message's sources; 0 when there are none. */
export function topScore(citations: readonly Citation[]): number {
  return citations.reduce((best, citation) => Math.max(best, citation.score), 0)
}

/**
 * A score as a 0–1 share of the message's best one. Scores are rank-fusion or cosine values,
 * not percentages, so they only mean something relative to each other.
 */
export function relativeRelevance(score: number, best: number): number {
  if (best <= 0) return 0
  return Math.min(Math.max(score / best, 0), 1)
}

function splitCode(markdown: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = []
  let start = 0
  for (const match of markdown.matchAll(CODE)) {
    segments.push({ text: markdown.slice(start, match.index), code: false })
    segments.push({ text: match[0], code: true })
    start = match.index + match[0].length
  }
  segments.push({ text: markdown.slice(start), code: false })
  return segments
}

/** The source numbers of one marker's list that name an existing source, in order. */
function citedIn(list: string, sourceCount: number): number[] {
  return list
    .split(MARKER_SEPARATOR)
    .map((item) => Number(item.trim()))
    .filter((index) => Number.isInteger(index) && index >= 1 && index <= sourceCount)
}
