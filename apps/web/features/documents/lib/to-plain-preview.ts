// Previews are the first 240 characters, often cut mid-syntax, so light pattern stripping reads
// better than a Markdown parser would. Order matters: whole-line rules run before inline ones.
const MARKDOWN_RULES: readonly (readonly [RegExp, string])[] = [
  [/^ {0,3}(?:```|~~~).*$/gm, ''], // code fence lines (the code itself stays)
  [/^ {0,3}\[[^\]]+\]:\s*\S.*$/gm, ''], // reference link definitions
  [/^[\s|:*_-]+$/gm, ''], // rules and table separator rows
  [/^ {0,3}#{1,6}\s+/gm, ''], // heading markers
  [/^ {0,3}>\s?/gm, ''], // blockquote markers
  [/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/gm, ''], // list and task markers
  [/<[^>]+>/g, ' '], // raw HTML tags
  [/!?\[([^\]]*)\]\([^)]*\)?/g, '$1'], // images and links keep their text
  [/\*\*|__|~~|`/g, ''], // strong, strikethrough and code markers
  [/(^|[\s([])[*_](?=\S)/g, '$1'], // opening emphasis, sparing snake_case
  [/(?<=\S)[*_](?=[\s)\].,;:!?]|$)/g, ''], // closing emphasis
  [/\|/g, ' '], // table cell borders
]
const WHITESPACE_RUN = /\s+/g

export function toPlainPreview(markdown: string): string {
  const text = MARKDOWN_RULES.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    markdown
  )
  return text.replace(WHITESPACE_RUN, ' ').trim()
}
