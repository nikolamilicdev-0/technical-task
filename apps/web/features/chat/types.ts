import type {
  ChatDoneEvent,
  ChatMetaEvent,
  ChatUsage,
  Citation,
  Conversation,
  DocumentSummary,
  ErrorCode,
  FinishReason,
  ListConversationsQuery,
  MessageRole,
  MessageUsage,
  updateConversationSchema,
} from '@kb/contracts'
import type { z } from 'zod'

export interface SseMessage {
  event: string
  data: string
  id: string
  retry?: number
}

export type ChatStreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'stopped' | 'error'

export interface PendingUserMessage {
  content: string
  documentIds?: string[]
  createdAt: string
}

export type StreamErrorCode = ErrorCode | 'network' | 'interrupted'

export interface StreamError {
  code: StreamErrorCode
  message: string | null
  retryAfter: number | null
}

export interface ChatStreamState {
  status: ChatStreamStatus
  pendingUserMessage: PendingUserMessage | null
  draft: string
  citations: readonly Citation[]
  usage: ChatUsage | null
  /** Set once the API has stored the question. */
  meta: ChatMetaEvent | null
  /** Set once the API has stored the answer. */
  done: ChatDoneEvent | null
  error: StreamError | null
}

export type ChatStreamAction =
  | { type: 'start'; message: PendingUserMessage }
  | { type: 'meta'; meta: ChatMetaEvent }
  | { type: 'sources'; citations: readonly Citation[] }
  | { type: 'delta'; text: string }
  | { type: 'usage'; usage: ChatUsage }
  | { type: 'done'; done: ChatDoneEvent }
  | { type: 'stop' }
  | { type: 'fail'; error: StreamError }
  | { type: 'reset' }

export interface PlaceholderIds {
  question: string
  answer: string
}

export interface StreamResult {
  state: ChatStreamState
  done: ChatDoneEvent | null
  placeholderIds: PlaceholderIds
  settledAt: string
}

export interface MessageItem {
  key: string
  author: MessageRole
  content: string
  citations: readonly Citation[]
  streaming: boolean
  finishReason?: FinishReason
  usage?: MessageUsage
}

export type FinishNoteReason = Exclude<FinishReason, 'stop' | 'unknown'>

export interface IndexingSummary {
  indexing: number
  failed: readonly Pick<DocumentSummary, 'id' | 'title'>[]
  ready: readonly DocumentSummary[]
  total: number
}

export interface IndexingNoticeCopy {
  indexing: string | null
  failed: string | null
}

export type SubmitKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'isComposing' | 'keyCode'
>

export interface CitationActions {
  citations: readonly Citation[]
  sourcesId: string
  revealSource: (index: number) => void
}

/** A request to reveal source `index`; each click makes a new one, so repeats scroll again. */
export interface SourceFocusRequest {
  index: number
}

export type ConversationsListParams = Pick<ListConversationsQuery, 'limit'>

export type RenameConversationValues = z.input<typeof updateConversationSchema>

export type ConversationTarget = Pick<Conversation, 'id' | 'title'>

export type ConversationDialog = 'rename' | 'delete'

export type ThreadView = 'loading' | 'error' | 'notFound' | 'empty' | 'messages'

export interface ThreadViewInput {
  saved: boolean
  hasData: boolean
  isError: boolean
  notFound: boolean
  itemCount: number
}
