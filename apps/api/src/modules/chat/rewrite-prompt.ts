import type { ChatMessage } from '@kb/ai'
import { MESSAGE_MAX_LENGTH } from '@kb/contracts'

import type { TokenCounting } from '../../ai/token-counter.types.js'
import { takeCodePoints } from '../../common/utils/text.js'
import {
  QUERY_REWRITE_HISTORY_MESSAGES,
  QUERY_REWRITE_MESSAGE_MAX_TOKENS,
} from './chat.constants.js'
import type { HistoryMessage } from './chat.types.js'
import {
  QUERY_REWRITE_CONVERSATION_LABEL,
  QUERY_REWRITE_INSTRUCTIONS,
  QUERY_REWRITE_QUESTION_LABEL,
  QUERY_REWRITE_SPEAKERS,
} from './prompt.constants.js'

const WHITESPACE_RUN = /\s+/g
const LINE_BREAK = /\r\n|\r|\n/
const QUERY_LABEL = /^(?:standalone\s+)?(?:search\s+)?query\s*:\s*/i
const WRAPPING_QUOTES = /^["'`“”‘’]+|["'`“”‘’]+$/g
const CLIPPED_MARK = '…'

/** The rewrite prompt: the last few messages, each on one clipped line, then the follow-up. */
export function buildRewriteMessages(
  question: string,
  history: readonly HistoryMessage[],
  counter: TokenCounting
): ChatMessage[] {
  const transcript = history
    .slice(-QUERY_REWRITE_HISTORY_MESSAGES)
    .map(({ role, content }) => `${QUERY_REWRITE_SPEAKERS[role]}: ${clip(content, counter)}`)
  const conversation = [QUERY_REWRITE_CONVERSATION_LABEL, ...transcript].join('\n')
  return [
    { role: 'system', content: QUERY_REWRITE_INSTRUCTIONS },
    { role: 'user', content: `${conversation}\n\n${QUERY_REWRITE_QUESTION_LABEL} ${question}` },
  ]
}

/** The query on the model's first line without label or quotes; null when nothing is left. */
export function cleanRewrittenQuery(text: string): string | null {
  const [firstLine = ''] = text.trim().split(LINE_BREAK, 1)
  const query = firstLine
    .replace(QUERY_LABEL, '')
    .replace(WRAPPING_QUOTES, '')
    .replace(WHITESPACE_RUN, ' ')
    .trim()
  return query === '' ? null : takeCodePoints(query, MESSAGE_MAX_LENGTH)
}

function clip(content: string, counter: TokenCounting): string {
  const line = content.replace(WHITESPACE_RUN, ' ').trim()
  const [head = '', ...rest] = counter.splitByTokens(line, QUERY_REWRITE_MESSAGE_MAX_TOKENS)
  return rest.length === 0 ? head : `${head.trimEnd()}${CLIPPED_MARK}`
}
