import { useQuery } from '@tanstack/react-query'

import { CONVERSATIONS_LIST_PARAMS } from '@/features/chat/constants'
import { conversationsKeys } from '@/features/chat/lib/conversations-keys'
import { conversationsService } from '@/features/chat/services/conversations-service'

export function useConversations() {
  return useQuery({
    queryKey: conversationsKeys.list(CONVERSATIONS_LIST_PARAMS),
    queryFn: ({ signal }) => conversationsService.list(CONVERSATIONS_LIST_PARAMS, signal),
  })
}
