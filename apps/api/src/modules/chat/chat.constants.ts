import { EVENT_STREAM_MEDIA_TYPE } from '@kb/contracts'

export const CONVERSATION_ID_PARAM = 'id'
export const CONVERSATION_ITEM_ROUTE = `:${CONVERSATION_ID_PARAM}`
export const CONVERSATION_MESSAGES_ROUTE = `${CONVERSATION_ITEM_ROUTE}/messages`

export const CONVERSATION_NOT_FOUND_MESSAGE = 'Conversation not found'

// Literal select lists: supabase-js infers the row types from their text.
export const CONVERSATION_COLUMNS = 'id, title, created_at, updated_at' as const
export const MESSAGE_COLUMNS = `id, conversation_id, role, content, citations, model,
  finish_reason, prompt_tokens, completion_tokens, usage_estimated, created_at` as const

/** Recent messages loaded for a new answer; the history token budget trims them further. */
export const HISTORY_MESSAGE_LIMIT = 20

/** Code points of chunk text a citation carries, like a document's content preview. */
export const CITATION_EXCERPT_LENGTH = 240

/** A rewrite slower than this is abandoned and the question is searched as asked. */
export const QUERY_REWRITE_TIMEOUT_MS = 4_000
/** Room for a one-line query, plus the reasoning tokens thinking models spend first. */
export const QUERY_REWRITE_MAX_TOKENS = 256
/** Messages of the conversation the rewrite sees, and how much of each. */
export const QUERY_REWRITE_HISTORY_MESSAGES = 6
export const QUERY_REWRITE_MESSAGE_MAX_TOKENS = 300

/** A comment frame: proxies see traffic on a quiet stream, SSE parsers skip it. */
export const SSE_HEARTBEAT = ': keep-alive\n\n'
export const SSE_HEARTBEAT_INTERVAL_MS = 15_000
export const SSE_RESPONSE_HEADERS = {
  'Content-Type': `${EVENT_STREAM_MEDIA_TYPE}; charset=utf-8`,
  // no-transform: proxies must neither compress nor buffer the stream.
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // nginx buffers proxied responses unless the upstream opts out.
  'X-Accel-Buffering': 'no',
} as const
