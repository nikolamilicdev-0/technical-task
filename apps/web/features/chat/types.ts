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

/** One Server-Sent Event, as the HTML event-stream rules dispatch it. */
export interface SseMessage {
  /** The `event:` field; `message` when the frame names none. */
  event: string
  /** Every `data:` line of the frame, joined with line feeds. */
  data: string
  /** The last `id:` the stream announced; empty until one arrives. */
  id: string
  /** The reconnection delay in ms the stream last announced with `retry:`. */
  retry?: number
}

export type ChatStreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'stopped' | 'error'

/** The question on its way; shown until its exchange is in the conversation cache. */
export interface PendingUserMessage {
  content: string
  documentIds?: string[]
  createdAt: string
}

/** Contract error codes, plus failures that never produced one. */
export type StreamErrorCode = ErrorCode | 'network' | 'interrupted'

/** Why an answer failed, with what the error row needs to explain it. */
export interface StreamError {
  code: StreamErrorCode
  /** The server's own explanation, for codes without copy of their own. */
  message: string | null
  /** Seconds until sending again can succeed. */
  retryAfter: number | null
}

export interface ChatStreamState {
  status: ChatStreamStatus
  pendingUserMessage: PendingUserMessage | null
  /** The answer text received so far. */
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

/** Ids for messages the API has not confirmed; the next fetch replaces them. */
export interface PlaceholderIds {
  question: string
  answer: string
}

/** What a settled stream leaves for the cache: finished with `done`, or interrupted (`null`). */
export interface StreamResult {
  state: ChatStreamState
  done: ChatDoneEvent | null
  placeholderIds: PlaceholderIds
  settledAt: string
}

/** One bubble of the thread, from the stored history or from the answer in flight. */
export interface MessageItem {
  key: string
  author: MessageRole
  content: string
  citations: readonly Citation[]
  /** Tokens are still arriving. */
  streaming: boolean
  finishReason?: FinishReason
  usage?: MessageUsage
}

/** Finish reasons that deserve a note under the answer. */
export type FinishNoteReason = Exclude<FinishReason, 'stop' | 'unknown'>

/** Which documents chat can use right now, from the cached documents list. */
export interface IndexingSummary {
  /** Queued or being indexed: answers cannot use them yet. */
  indexing: number
  failed: readonly Pick<DocumentSummary, 'id' | 'title'>[]
  ready: readonly DocumentSummary[]
  total: number
}

/** What the indexing notice says; null parts are left out. */
export interface IndexingNoticeCopy {
  indexing: string | null
  failed: string | null
}

/** The keyboard facts the composer's Enter handling reads. */
export type SubmitKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'isComposing' | 'keyCode'
>

/** Lets inline citation chips open their message's sources. */
export interface CitationActions {
  citations: readonly Citation[]
  /** Id of the sources list the chips control. */
  sourcesId: string
  revealSource: (index: number) => void
}

/** A request to reveal source `index`; each click makes a new one, so repeats scroll again. */
export interface SourceFocusRequest {
  index: number
}

/** Query of the single conversations list request the sidebar makes. */
export type ConversationsListParams = Pick<ListConversationsQuery, 'limit'>

export type RenameConversationValues = z.input<typeof updateConversationSchema>

/** The conversation a list action (rename, delete) applies to. */
export type ConversationTarget = Pick<Conversation, 'id' | 'title'>

export type ConversationDialog = 'rename' | 'delete'

/** What the thread shows below its header. */
export type ThreadView = 'loading' | 'error' | 'notFound' | 'empty' | 'messages'

export interface ThreadViewInput {
  /** The thread belongs to a saved conversation (not a new chat). */
  saved: boolean
  hasData: boolean
  isError: boolean
  notFound: boolean
  itemCount: number
}
