import type { ChatMessage } from '@kb/ai'
import { Inject, Injectable } from '@nestjs/common'

import { TokenCounter } from '../../ai/token-counter.js'
import type { TokenCounting } from '../../ai/token-counter.types.js'
import type { AppConfig } from '../../config/app-config.types.js'
import { APP_CONFIG } from '../../config/config.constants.js'
import type {
  BuiltPrompt,
  ConversationTurn,
  HistoryMessage,
  PromptBudgets,
  PromptInput,
  PromptSource,
} from './chat.types.js'
import {
  NO_SOURCES_NOTICE,
  PROMPT_SECTION_SEPARATOR,
  SOURCE_LABEL_CLOSE,
  SOURCE_LABEL_OPEN,
  SOURCES_HEADING,
  SYSTEM_RULES,
} from './prompt.constants.js'

@Injectable()
export class PromptBuilder {
  readonly #budgets: PromptBudgets

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(TokenCounter) private readonly counter: TokenCounting
  ) {
    this.#budgets = {
      contextTokens: config.rag.contextTokenBudget,
      historyTokens: config.rag.historyTokenBudget,
    }
  }

  build<TSource extends PromptSource>({
    question,
    sources,
    history,
  }: PromptInput<TSource>): BuiltPrompt<TSource> {
    const included = this.#fitSources(sources)
    const turns = this.#fitHistory(toConversationTurns(history))
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt(included) },
      ...turns.flatMap(({ question: asked, answer }) => [
        toChatMessage(asked),
        toChatMessage(answer),
      ]),
      { role: 'user', content: question },
    ]
    return { messages, sources: included }
  }

  // Sources are never cut: one that would overflow the budget is left out and the next tried.
  #fitSources<TSource extends PromptSource>(sources: readonly TSource[]): TSource[] {
    const included: TSource[] = []
    let used = 0
    for (const source of sources) {
      const tokens = this.counter.count(formatSource(included.length + 1, source))
      if (used + tokens > this.#budgets.contextTokens) continue
      included.push(source)
      used += tokens
    }
    return included
  }

  // Newest turns first, stopping at the first that no longer fits, so history has no gaps.
  #fitHistory(turns: readonly ConversationTurn[]): ConversationTurn[] {
    const kept: ConversationTurn[] = []
    let used = 0
    for (const turn of [...turns].reverse()) {
      const tokens =
        this.counter.count(turn.question.content) + this.counter.count(turn.answer.content)
      if (used + tokens > this.#budgets.historyTokens) break
      kept.unshift(turn)
      used += tokens
    }
    return kept
  }
}

/** Questions paired with their answers; a question left without an answer is dropped. */
export function toConversationTurns(history: readonly HistoryMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = []
  let question: HistoryMessage | undefined
  for (const message of history) {
    if (message.role === 'user') {
      question = message
    } else if (question !== undefined && message.content.trim() !== '') {
      turns.push({ question, answer: message })
      question = undefined
    }
  }
  return turns
}

function systemPrompt(sources: readonly PromptSource[]): string {
  if (sources.length === 0) return [SYSTEM_RULES, NO_SOURCES_NOTICE].join(PROMPT_SECTION_SEPARATOR)
  const blocks = sources.map((source, position) => formatSource(position + 1, source))
  return [SYSTEM_RULES, SOURCES_HEADING, ...blocks].join(PROMPT_SECTION_SEPARATOR)
}

function formatSource(
  index: number,
  { headingPath, documentTitle, content }: PromptSource
): string {
  const label = headingPath === '' ? documentTitle : headingPath
  return `[${index}] ${SOURCE_LABEL_OPEN}${label}${SOURCE_LABEL_CLOSE}\n${content}`
}

function toChatMessage({ role, content }: HistoryMessage): ChatMessage {
  return { role, content }
}
