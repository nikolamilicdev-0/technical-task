import { skipToken, useQuery } from '@tanstack/react-query'

import { conversationsKeys } from '@/features/chat/lib/conversations-keys'
import { conversationsService } from '@/features/chat/services/conversations-service'

// Key of the query that stands in for a conversation not created yet; it never fetches.
const UNSAVED_CONVERSATION_ID = 'unsaved'

interface UseConversationOptions {
  streaming: boolean
}

export function useConversation(id: string | null, { streaming }: UseConversationOptions) {
  return useQuery({
    queryKey: conversationsKeys.detail(id ?? UNSAVED_CONVERSATION_ID),
    queryFn: id ? ({ signal }) => conversationsService.get(id, signal) : skipToken,
    // A focus refetch landing mid-answer would race the exchange the stream is about to commit.
    refetchOnWindowFocus: !streaming,
  })
}
