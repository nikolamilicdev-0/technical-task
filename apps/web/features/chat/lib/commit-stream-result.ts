import type { ChatUsage, ConversationDetail, Message, MessageUsage } from '@kb/contracts'

import { markCited } from '@/features/chat/lib/citations'
import type { StreamResult } from '@/features/chat/types'

export function toMessageUsage(usage: ChatUsage | null): MessageUsage | undefined {
  if (!usage) return undefined
  const { promptTokens, completionTokens, totalTokens, estimated } = usage
  return { promptTokens, completionTokens, totalTokens, estimated }
}

// Mirrors what the API persists: without `done`, a partial answer is kept as `aborted`, and only
// when text arrived.
function toExchangeMessages(conversationId: string, result: StreamResult): Message[] {
  const { state, done, placeholderIds, settledAt } = result
  const question = state.pendingUserMessage
  if (!question) return []

  const questionMessage: Message = {
    id: state.meta?.userMessageId ?? placeholderIds.question,
    conversationId,
    role: 'user',
    content: question.content,
    citations: [],
    createdAt: question.createdAt,
  }
  if (!done && state.draft === '') return [questionMessage]

  const answer: Message = {
    id: done?.assistantMessageId ?? placeholderIds.answer,
    conversationId,
    role: 'assistant',
    content: state.draft,
    citations: markCited(state.citations, state.draft),
    finishReason: done?.finishReason ?? 'aborted',
    ...(state.usage ? { model: state.usage.model, usage: toMessageUsage(state.usage) } : {}),
    createdAt: settledAt,
  }
  return [questionMessage, answer]
}

/** Replaces copies a refetch already brought in, so the exchange is never listed twice. */
export function appendExchange(
  detail: ConversationDetail | undefined,
  result: StreamResult
): ConversationDetail | undefined {
  if (!detail) return undefined
  const exchange = toExchangeMessages(detail.conversation.id, result)
  if (exchange.length === 0) return detail

  const exchangeIds = new Set(exchange.map((message) => message.id))
  return {
    conversation: {
      ...detail.conversation,
      title: detail.conversation.title ?? result.state.meta?.title ?? null,
      updatedAt: result.settledAt,
    },
    messages: [...detail.messages.filter((message) => !exchangeIds.has(message.id)), ...exchange],
  }
}
