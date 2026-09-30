import { AiProviderError, type ChatMessage, type ChatModel, type EmbeddingModel } from '@kb/ai'
import {
  type ChatDeltaEvent,
  deriveConversationTitle,
  type FinishReason,
  type Message,
  type SendMessageInput,
} from '@kb/contracts'
import { Inject, Injectable, Logger } from '@nestjs/common'

import { CHAT_MODEL, EMBEDDING_MODEL } from '../../ai/ai.constants.js'
import { TokenCounter } from '../../ai/token-counter.js'
import type { TokenCounting } from '../../ai/token-counter.types.js'
import { describeError } from '../../common/errors/describe-error.js'
import { elapsedMs } from '../../common/utils/elapsed.js'
import { stripNul } from '../../common/utils/text.js'
import type { AppConfig, RagSettings } from '../../config/app-config.types.js'
import { APP_CONFIG } from '../../config/config.constants.js'
import type { UserContext } from '../../database/user-context.types.js'
import { RetrievalService } from '../retrieval/retrieval.service.js'
import { estimateChatUsage, estimateEmbeddingUsage, meterUsage } from '../usage/usage-estimate.js'
import { UsageRecorder } from '../usage/usage-recorder.js'
import { HISTORY_MESSAGE_LIMIT } from './chat.constants.js'
import { conversationNotFound, toChatErrorEvent } from './chat-errors.js'
import type {
  AnswerContext,
  ChatEventStream,
  ChatRun,
  ChatTurnContext,
  StoredAnswer,
  StreamOutcome,
} from './chat.types.js'
import { markCited, toCitations } from './citations.mapper.js'
import { ConversationsRepository } from './conversations.repository.js'
import { toAnswerInsert, toQuestionInsert } from './messages.mapper.js'
import { MessagesRepository } from './messages.repository.js'
import { PromptBuilder } from './prompt-builder.js'
import { QueryRewriter } from './query-rewriter.js'

@Injectable()
export class RagChatService {
  readonly #logger = new Logger(RagChatService.name)
  readonly #settings: RagSettings

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(CHAT_MODEL) private readonly chat: ChatModel,
    @Inject(EMBEDDING_MODEL) private readonly embedding: EmbeddingModel,
    @Inject(TokenCounter) private readonly counter: TokenCounting,
    private readonly conversations: ConversationsRepository,
    private readonly messages: MessagesRepository,
    private readonly retrieval: RetrievalService,
    private readonly rewriter: QueryRewriter,
    private readonly prompts: PromptBuilder,
    private readonly usage: UsageRecorder
  ) {
    this.#settings = config.rag
  }

  /** Throws the 404 before anything is stored or sent. */
  async prepare(
    user: UserContext,
    conversationId: string,
    input: SendMessageInput
  ): Promise<ChatRun> {
    const conversation = await this.conversations.findById(user.db, conversationId)
    if (conversation === null) throw conversationNotFound()
    const history = await this.messages.listRecent(user.db, conversationId, HISTORY_MESSAGE_LIMIT)
    const turn: ChatTurnContext = { user, conversation, history, input }
    return { events: (signal) => this.#run(turn, signal) }
  }

  // `done` follows the stored answer; after an abort nothing is sent, but the partial is kept.
  async *#run(turn: ChatTurnContext, signal: AbortSignal): ChatEventStream {
    const startedAt = performance.now()
    let question: Message | null = null
    try {
      const { user, conversation, input } = turn
      question = await this.messages.insert(
        user.db,
        toQuestionInsert(conversation.id, input.content)
      )
      const title = await this.#titleFor(turn)
      yield { type: 'meta', conversationId: conversation.id, userMessageId: question.id, title }
      const context = await this.#findSources(turn, signal)
      yield { type: 'sources', citations: context.citations }
      const outcome = yield* this.#streamAnswer(context.prompt.messages, signal, startedAt)
      const answer = await this.#storeAnswer(turn, context, outcome, startedAt)
      if (outcome.status === 'failed') {
        this.#reportFailure(outcome.error)
        yield toChatErrorEvent(outcome.error)
      } else if (outcome.status === 'finished' && answer !== null) {
        yield { type: 'usage', ...answer.usage, model: answer.model }
        yield {
          type: 'done',
          userMessageId: question.id,
          assistantMessageId: answer.message.id,
          finishReason: outcome.finishReason,
        }
      }
      return { userMessage: question, assistantMessage: answer?.message ?? null }
    } catch (error) {
      if (!signal.aborted) {
        this.#reportFailure(error)
        yield toChatErrorEvent(error)
      }
      return question === null ? null : { userMessage: question, assistantMessage: null }
    }
  }

  async #titleFor({ user, conversation, input }: ChatTurnContext): Promise<string | null> {
    if (conversation.title !== null) return conversation.title
    const title = deriveConversationTitle(input.content)
    if (title === null) return null
    const named = await this.conversations.setTitleIfUntitled(user.db, conversation.id, title)
    if (named !== null) return named.title
    // A concurrent request named it first.
    return (await this.conversations.findById(user.db, conversation.id))?.title ?? null
  }

  async #findSources(turn: ChatTurnContext, signal: AbortSignal): Promise<AnswerContext> {
    const question = turn.input.content
    const rewrittenQuery = await this.#rewrite(turn, signal)
    const query = rewrittenQuery ?? question
    const startedAt = performance.now()
    const embedding = await this.#embedQuery(turn, query, signal)
    const chunks = await this.retrieval.retrieve(turn.user, {
      query,
      embedding,
      documentIds: turn.input.documentIds,
    })
    const latencyMs = elapsedMs(startedAt)
    const prompt = this.prompts.build({ question, sources: chunks, history: turn.history })
    const { mode } = this.retrieval
    return {
      prompt,
      citations: toCitations(prompt.sources, mode),
      retrieval: {
        mode,
        query: question,
        rewrittenQuery,
        sourceCount: prompt.sources.length,
        latencyMs,
      },
    }
  }

  #rewrite(turn: ChatTurnContext, signal: AbortSignal): Promise<string | null> {
    const { user, conversation, history, input } = turn
    const request = { question: input.content, history, conversationId: conversation.id, signal }
    return this.rewriter.rewrite(user, request)
  }

  async #embedQuery(turn: ChatTurnContext, query: string, signal: AbortSignal): Promise<number[]> {
    const startedAt = performance.now()
    const result = await this.embedding.embed({ texts: [query], signal })
    this.usage.record({
      userId: turn.user.userId,
      kind: 'embedding',
      provider: this.embedding.provider,
      model: result.model,
      usage: meterUsage(result.usage, () => estimateEmbeddingUsage([query], this.counter)),
      latencyMs: elapsedMs(startedAt),
      conversationId: turn.conversation.id,
    })
    return result.embeddings[0]
  }

  // Never throws: a failed or aborted stream ends with the text produced until then.
  async *#streamAnswer(
    messages: readonly ChatMessage[],
    signal: AbortSignal,
    runStartedAt: number
  ): AsyncGenerator<ChatDeltaEvent, StreamOutcome, undefined> {
    const startedAt = performance.now()
    let text = ''
    let firstTokenMs: number | null = null
    const progress = () => ({ text, firstTokenMs, latencyMs: elapsedMs(startedAt) })
    try {
      const request = { messages, maxTokens: this.#settings.maxAnswerTokens, signal }
      for await (const event of this.chat.stream(request)) {
        if (event.type === 'done') {
          const { finishReason, usage, model } = event
          return { ...progress(), status: 'finished', finishReason, usage, model }
        }
        // Model output may hold U+0000, which Postgres cannot store; it goes before anyone sees it.
        const delta = stripNul(event.text)
        if (delta === '') continue
        text += delta
        firstTokenMs ??= elapsedMs(runStartedAt)
        yield { type: 'delta', text: delta }
      }
      // The port promises a `done`; an adapter that skips it still leaves a usable answer.
      return { ...progress(), status: 'finished', finishReason: 'unknown', model: this.chat.model }
    } catch (error) {
      if (signal.aborted) return { ...progress(), status: 'aborted' }
      return { ...progress(), status: 'failed', error }
    }
  }

  // Every stored answer is metered; one that failed before its first token is not stored.
  async #storeAnswer(
    turn: ChatTurnContext,
    context: AnswerContext,
    outcome: StreamOutcome,
    runStartedAt: number
  ): Promise<StoredAnswer | null> {
    if (outcome.status !== 'finished' && outcome.text === '') return null
    const { user, conversation } = turn
    const reported = outcome.status === 'finished' ? outcome.usage : undefined
    const usage = meterUsage(reported, () =>
      estimateChatUsage(context.prompt.messages, outcome.text, this.counter)
    )
    const model = outcome.status === 'finished' ? outcome.model : this.chat.model
    const message = await this.messages.insert(
      user.db,
      toAnswerInsert({
        conversationId: conversation.id,
        content: outcome.text,
        citations: markCited(context.citations, outcome.text),
        provider: this.chat.provider,
        model,
        finishReason: storedFinishReason(outcome),
        usage,
        metadata: {
          retrieval: context.retrieval,
          timing: { firstTokenMs: outcome.firstTokenMs, totalMs: elapsedMs(runStartedAt) },
        },
      })
    )
    this.usage.record({
      userId: user.userId,
      kind: 'chat',
      provider: this.chat.provider,
      model,
      usage,
      latencyMs: outcome.latencyMs,
      conversationId: conversation.id,
      messageId: message.id,
    })
    return { message, usage, model }
  }

  #reportFailure(error: unknown): void {
    if (error instanceof AiProviderError) {
      this.#logger.warn(`Answer failed at the AI provider: ${error.message}`)
      return
    }
    const stack = error instanceof Error ? error.stack : undefined
    this.#logger.error(`Answer failed: ${describeError(error)}`, stack)
  }
}

function storedFinishReason(outcome: StreamOutcome): FinishReason {
  if (outcome.status === 'finished') return outcome.finishReason
  return outcome.status === 'aborted' ? 'aborted' : 'error'
}
