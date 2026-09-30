import type { ThreadView, ThreadViewInput } from '@/features/chat/types'

/**
 * What the thread shows below its header. A new chat has no history to load, so it is empty
 * until its first question appears; a missing conversation wins over cached data.
 */
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
