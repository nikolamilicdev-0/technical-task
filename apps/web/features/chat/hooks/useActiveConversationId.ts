import { usePathname } from 'next/navigation'

import { getConversationIdFromPath } from '@/features/chat/lib/conversation-path'

export function useActiveConversationId(): string | null {
  return getConversationIdFromPath(usePathname())
}
