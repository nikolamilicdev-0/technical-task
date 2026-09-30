'use client'

import { ChatThreadSection } from '@/features/chat/components/ChatThreadSection'
import { useActiveConversationId } from '@/features/chat/hooks/useActiveConversationId'
import { useChatSession } from '@/features/chat/hooks/useChatSession'

export function ChatThreadClient() {
  const session = useChatSession(useActiveConversationId())
  return (
    <ChatThreadSection
      key={session.key}
      initialConversationId={session.conversationId}
      onConversationCreated={session.adopt}
    />
  )
}
