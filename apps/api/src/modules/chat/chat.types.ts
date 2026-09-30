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

/** One page of conversations; the service echoes the requested window back. */
export type ConversationPage = Pick<ConversationList, 'items' | 'total'>

/** A `conversations` row as the API selects it: all but the owner. */
export type ConversationRow = Omit<Tables<'conversations'>, 'user_id'>

/** A `messages` row as the API selects it: all but the owner and the diagnostics. */
export type MessageRow = Omit<Tables<'messages'>, 'user_id' | 'metadata' | 'provider'>

/** The columns the API writes; the owner defaults to the caller (`auth.uid()`). */
export type MessageInsertRow = Omit<TablesInsert<'messages'>, 'id' | 'user_id' | 'created_at'>

/** A stored message as a prompt sees it. */
export type HistoryMessage = Pick<Message, 'role' | 'content'>

/** A question and its answer: history is trimmed a whole turn at a time. */
export interface ConversationTurn {
  readonly question: HistoryMessage
  readonly answer: HistoryMessage
}

/** What the prompt shows of a source; the builder hands the full source back. */
export interface PromptSource {
  readonly documentTitle: string
  readonly headingPath: string
  readonly content: string
}

export interface PromptInput<TSource extends PromptSource> {
  readonly question: string
  /** Best first; sources that overflow the context budget are left out whole. */
  readonly sources: readonly TSource[]
  /** Oldest first, without the question itself. */
  readonly history: readonly HistoryMessage[]
}

export interface BuiltPrompt<TSource extends PromptSource> {
  readonly messages: ChatMessage[]
  /** The sources in the prompt, in order: the answer's `[n]` refers to `sources[n - 1]`. */
  readonly sources: TSource[]
}

/** Token budgets of one prompt. */
export interface PromptBudgets {
  readonly contextTokens: number
  readonly historyTokens: number
}

/** Everything an exchange needs, loaded before any response is sent. */
export interface ChatTurnContext {
  readonly user: UserContext
  readonly conversation: Conversation
  /** Recent messages, oldest first, without the new question. */
  readonly history: readonly Message[]
  readonly input: SendMessageInput
}

/** What a finished run stored; null when not even the question could be stored. */
export interface ChatRunOutcome {
  readonly userMessage: Message
  /** Null when no answer text was stored (a provider failure before the first token, say). */
  readonly assistantMessage: Message | null
}

/** The SSE events of one exchange; the generator's return value is what it stored. */
export type ChatEventStream = AsyncGenerator<ChatSseEvent, ChatRunOutcome | null, undefined>

/** One exchange, ready to run: `events` stores as it goes and turns failures into `error` events. */
export interface ChatRun {
  events(signal: AbortSignal): ChatEventStream
}

/** A follow-up question to turn into a standalone search query. */
export interface RewriteRequest {
  readonly question: string
  readonly history: readonly HistoryMessage[]
  readonly conversationId: string
  readonly signal: AbortSignal
}

// Type aliases, not interfaces: only they stay assignable to the jsonb column type.
export type RetrievalMetadata = {
  readonly mode: RetrievalMode
  /** The question as asked. */
  readonly query: string
  /** The standalone query that was searched instead, if the question was rewritten. */
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

/** The sources and prompt found for a question. */
export interface AnswerContext {
  readonly prompt: BuiltPrompt<RetrievedChunk>
  readonly citations: Citation[]
  readonly retrieval: RetrievalMetadata
}

/** How the model's stream ended, with the text it produced until then. */
export type StreamOutcome = {
  readonly text: string
  readonly firstTokenMs: number | null
  /** How long the model call took. */
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

/** An answer to store on the conversation. */
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

/** A stored answer and what it cost. */
export interface StoredAnswer {
  readonly message: Message
  readonly usage: MeteredUsage
  readonly model: string
}
