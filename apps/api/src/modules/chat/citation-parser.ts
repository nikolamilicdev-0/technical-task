// `[1]`, `[1, 2]`; not a Markdown link (`[1](url)`) or link definition (`[1]: url`).
const CITATION_MARKER = /\[(\s*\d+\s*(?:,\s*\d+\s*)*)\](?![(:])/g
const MARKER_SEPARATOR = ','
// Brackets in code are indexing (`items[1]`), not citations.
const FENCED_CODE = /(`{3,}|~{3,})[\s\S]*?(?:\1|$)/g
const INLINE_CODE = /`[^`\n]*`/g

/** The source numbers an answer cites, ascending and unique; numbers without a source are ignored. */
export function parseCitations(text: string, sourceCount: number): number[] {
  const prose = text.replace(FENCED_CODE, '').replace(INLINE_CODE, '')
  const cited = new Set<number>()
  for (const [, list = ''] of prose.matchAll(CITATION_MARKER)) {
    for (const item of list.split(MARKER_SEPARATOR)) {
      const index = Number(item.trim())
      if (Number.isInteger(index) && index >= 1 && index <= sourceCount) cited.add(index)
    }
  }
  return [...cited].sort((a, b) => a - b)
}
