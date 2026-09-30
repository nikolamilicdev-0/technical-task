import { usePathname } from 'next/navigation'

import { getConversationIdFromPath } from '@/features/chat/lib/conversation-path'

/** The conversation the URL shows, including one a first question just created in place. */
export function useActiveConversationId(): string | null {
  return getConversationIdFromPath(usePathname())
}
