import { CONVERSATION_TITLE_DERIVED_MAX } from './limits.js'

const LINE_BREAK = /\r\n|\r|\n/
const WHITESPACE_RUN = /\s+/g

/** First line of the message, whitespace collapsed, cut at a word boundary; null when blank. */
export function deriveConversationTitle(text: string): string | null {
  const [firstLine = ''] = text.trim().split(LINE_BREAK, 1)
  const title = firstLine.replace(WHITESPACE_RUN, ' ').trim()
  if (title === '') return null
  return truncateAtWordBoundary(title, CONVERSATION_TITLE_DERIVED_MAX)
}

// Counts code points (like Postgres char_length) so a cut never splits a surrogate pair.
function truncateAtWordBoundary(value: string, maxLength: number): string {
  const codePoints = Array.from(value)
  if (codePoints.length <= maxLength) return value

  const head = codePoints.slice(0, maxLength + 1).join('')
  const boundary = head.lastIndexOf(' ')
  return boundary > 0 ? head.slice(0, boundary) : codePoints.slice(0, maxLength).join('')
}
