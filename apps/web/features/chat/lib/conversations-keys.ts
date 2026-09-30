import type { ConversationsListParams } from '@/features/chat/types'

/** React Query keys: invalidating `lists()` or `details()` covers every list or conversation. */
export const conversationsKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationsKeys.all, 'list'] as const,
  list: (params: ConversationsListParams) => [...conversationsKeys.lists(), params] as const,
  details: () => [...conversationsKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationsKeys.details(), id] as const,
}
