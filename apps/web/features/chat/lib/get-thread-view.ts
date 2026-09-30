import type {
  ChatStreamStatus,
  MessageItem,
  ThreadView,
  ThreadViewInput,
} from '@/features/chat/types'

/** A missing conversation wins over cached data; a new chat has no history to load. */
export function getThreadView({
  saved,
  hasData,
  isError,
  notFound,
  itemCount,
}: ThreadViewInput): ThreadView {
  if (notFound) return 'notFound'
  if (saved && !hasData) return isError ? 'error' : 'loading'
  return itemCount === 0 ? 'empty' : 'messages'
}

export function endsOnStoppedQuestion(
  status: ChatStreamStatus,
  items: readonly MessageItem[]
): boolean {
  return status === 'stopped' && items[items.length - 1]?.author === 'user'
}
