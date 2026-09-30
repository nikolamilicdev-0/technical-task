import type { FinishReason, Message } from '@kb/contracts'

import { NO_CITATIONS, PENDING_ANSWER_KEY, PENDING_QUESTION_KEY } from '@/features/chat/constants'
import { isReceiving } from '@/features/chat/lib/chat-stream-reducer'
import { markCited } from '@/features/chat/lib/citations'
import { toMessageUsage } from '@/features/chat/lib/commit-stream-result'
import type { ChatStreamState, MessageItem } from '@/features/chat/types'

// The exchange in flight drops out once the history holds its question, whether the commit or a
// refetch put it there.
export function buildMessageList(
  history: readonly Message[],
  stream: ChatStreamState
): MessageItem[] {
  const stored = history.map(toMessageItem)
  const inFlight = toInFlightItems(history, stream)
  return inFlight.length > 0 ? [...stored, ...inFlight] : stored
}

// Fields are passed through by reference so memoised bubbles of the history stay untouched.
function toMessageItem(message: Message): MessageItem {
  return {
    key: message.id,
    author: message.role,
    content: message.content,
    citations: message.citations,
    streaming: false,
    finishReason: message.finishReason,
    usage: message.usage,
  }
}

function toInFlightItems(history: readonly Message[], stream: ChatStreamState): MessageItem[] {
  const { pendingUserMessage: question, meta, done, status, draft } = stream
  if (!question) return []
  if (meta && history.some((message) => message.id === meta.userMessageId)) return []

  const questionItem: MessageItem = {
    key: meta?.userMessageId ?? PENDING_QUESTION_KEY,
    author: 'user',
    content: question.content,
    citations: NO_CITATIONS,
    streaming: false,
  }
  const receiving = isReceiving(status)
  if (!receiving && draft === '') return [questionItem]

  const answerItem: MessageItem = {
    key: done?.assistantMessageId ?? PENDING_ANSWER_KEY,
    author: 'assistant',
    content: draft,
    citations: markCited(stream.citations, draft),
    streaming: receiving,
    finishReason: settledFinishReason(stream),
    usage: toMessageUsage(stream.usage),
  }
  return [questionItem, answerItem]
}

function settledFinishReason({ status, done }: ChatStreamState): FinishReason | undefined {
  if (status === 'done') return done?.finishReason
  return status === 'stopped' ? 'aborted' : undefined
}
