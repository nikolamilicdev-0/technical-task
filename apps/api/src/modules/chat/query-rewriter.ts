import type { ChatModel } from '@kb/ai'
import { Inject, Injectable, Logger } from '@nestjs/common'

import { CHAT_MODEL } from '../../ai/ai.constants.js'
import { TokenCounter } from '../../ai/token-counter.js'
import type { TokenCounting } from '../../ai/token-counter.types.js'
import { describeError } from '../../common/errors/describe-error.js'
import { elapsedMs } from '../../common/utils/elapsed.js'
import type { AppConfig } from '../../config/app-config.types.js'
import { APP_CONFIG } from '../../config/config.constants.js'
import type { UserContext } from '../../database/user-context.types.js'
import { estimateChatUsage, meterUsage } from '../usage/usage-estimate.js'
import { UsageRecorder } from '../usage/usage-recorder.js'
import { QUERY_REWRITE_MAX_TOKENS, QUERY_REWRITE_TIMEOUT_MS } from './chat.constants.js'
import type { RewriteRequest } from './chat.types.js'
import { buildRewriteMessages, cleanRewrittenQuery } from './rewrite-prompt.js'

/** Condenses a follow-up ("what about its pricing?") into a query that searches on its own. */
@Injectable()
export class QueryRewriter {
  readonly #logger = new Logger(QueryRewriter.name)
  readonly #enabled: boolean
  /** A slow rewrite must not hold the answer up: past this, the question is searched as asked. */
  protected readonly timeoutMs: number = QUERY_REWRITE_TIMEOUT_MS

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(CHAT_MODEL) private readonly chat: ChatModel,
    @Inject(TokenCounter) private readonly counter: TokenCounting,
    private readonly usage: UsageRecorder
  ) {
    this.#enabled = config.rag.queryRewrite
  }

  /**
   * The standalone query, or null to search the question as asked: always for a first question
   * (it stands on its own), with RAG_QUERY_REWRITE off, and when the rewrite fails or times out.
   */
  async rewrite(user: UserContext, request: RewriteRequest): Promise<string | null> {
    const { question, history, conversationId, signal } = request
    if (!this.#enabled || history.length === 0) return null
    const messages = buildRewriteMessages(question, history, this.counter)
    const startedAt = performance.now()
    try {
      const completion = await this.chat.complete({
        messages,
        maxTokens: QUERY_REWRITE_MAX_TOKENS,
        signal: AbortSignal.any([signal, AbortSignal.timeout(this.timeoutMs)]),
      })
      this.usage.record({
        userId: user.userId,
        kind: 'query_rewrite',
        provider: this.chat.provider,
        model: completion.model,
        usage: meterUsage(completion.usage, () =>
          estimateChatUsage(messages, completion.text, this.counter)
        ),
        latencyMs: elapsedMs(startedAt),
        conversationId,
      })
      const query = cleanRewrittenQuery(completion.text)
      if (query === null) this.#logger.warn(`Query rewrite came back empty for ${conversationId}`)
      else this.#logger.log(`Follow-up in conversation ${conversationId} searched as: ${query}`)
      return query
    } catch (error) {
      if (!signal.aborted) {
        this.#logger.warn(
          `Query rewrite failed, searching the question as asked: ${describeError(error)}`
        )
      }
      return null
    }
  }
}
