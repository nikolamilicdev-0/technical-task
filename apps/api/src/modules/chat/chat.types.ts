import type { ChatMessage, FinishReason as ModelFinishReason, TokenUsage } from '@kb/ai'
import type {
  ChatSseEvent,
  Citation,
  Conversation,
  ConversationList,
  FinishReason,
  Message,
  SendMessageInput,
} from '@kb/contracts'

import type { RetrievalMode } from '../../config/app-config.types.js'
import type { Tables, TablesInsert } from '../../database/database.types.js'
import type { UserContext } from '../../database/user-context.types.js'
import type { RetrievedChunk } from '../retrieval/retrieval.types.js'
import type { MeteredUsage } from '../usage/usage.types.js'

export type ConversationPage = Pick<ConversationList, 'items' | 'total'>

export type ConversationRow = Omit<Tables<'conversations'>, 'user_id'>

export type MessageRow = Omit<Tables<'messages'>, 'user_id' | 'metadata' | 'provider'>

/** `user_id` defaults to the caller (`auth.uid()`) in the database. */
export type MessageInsertRow = Omit<TablesInsert<'messages'>, 'id' | 'user_id' | 'created_at'>

export type HistoryMessage = Pick<Message, 'role' | 'content'>

export interface ConversationTurn {
  readonly question: HistoryMessage
  readonly answer: HistoryMessage
}

export interface PromptSource {
  readonly documentTitle: string
  readonly headingPath: string
  readonly content: string
}

export interface PromptInput<TSource extends PromptSource> {
  readonly question: string
  readonly sources: readonly TSource[]
  /** Oldest first, without the question itself. */
  readonly history: readonly HistoryMessage[]
}

export interface BuiltPrompt<TSource extends PromptSource> {
  readonly messages: ChatMessage[]
  /** The sources in the prompt, in order: the answer's `[n]` refers to `sources[n - 1]`. */
  readonly sources: TSource[]
}

export interface PromptBudgets {
  readonly contextTokens: number
  readonly historyTokens: number
}

export interface ChatTurnContext {
  readonly user: UserContext
  readonly conversation: Conversation
  readonly history: readonly Message[]
  readonly input: SendMessageInput
}

export interface ChatRunOutcome {
  readonly userMessage: Message
  /** Null when no answer text was stored (a provider failure before the first token, say). */
  readonly assistantMessage: Message | null
}

/** Returns what the run stored; null when not even the question could be stored. */
export type ChatEventStream = AsyncGenerator<ChatSseEvent, ChatRunOutcome | null, undefined>

/** `events` stores as it goes and turns failures into `error` events. */
export interface ChatRun {
  events(signal: AbortSignal): ChatEventStream
}

export interface RewriteRequest {
  readonly question: string
  readonly history: readonly HistoryMessage[]
  readonly conversationId: string
  readonly signal: AbortSignal
}

// Type aliases, not interfaces: only they stay assignable to the jsonb column type.
export type RetrievalMetadata = {
  readonly mode: RetrievalMode
  readonly query: string
  readonly rewrittenQuery: string | null
  readonly sourceCount: number
  /** Embedding the query plus both searches. */
  readonly latencyMs: number
}

export type AnswerMetadata = {
  readonly retrieval: RetrievalMetadata
  /** Milliseconds since the request started; null when no token arrived. */
  readonly timing: { readonly firstTokenMs: number | null; readonly totalMs: number }
}

export interface AnswerContext {
  readonly prompt: BuiltPrompt<RetrievedChunk>
  readonly citations: Citation[]
  readonly retrieval: RetrievalMetadata
}

export type StreamOutcome = {
  readonly text: string
  readonly firstTokenMs: number | null
  readonly latencyMs: number
} & (
  | {
      readonly status: 'finished'
      readonly finishReason: ModelFinishReason
      readonly usage?: TokenUsage
      readonly model: string
    }
  | { readonly status: 'aborted' }
  | { readonly status: 'failed'; readonly error: unknown }
)

export interface AnswerRecord {
  readonly conversationId: string
  readonly content: string
  readonly citations: readonly Citation[]
  readonly provider: string
  readonly model: string
  readonly finishReason: FinishReason
  readonly usage: MeteredUsage
  readonly metadata: AnswerMetadata
}

export interface StoredAnswer {
  readonly message: Message
  readonly usage: MeteredUsage
  readonly model: string
}
