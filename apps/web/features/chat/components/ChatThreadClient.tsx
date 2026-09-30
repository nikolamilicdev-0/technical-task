'use client'

import { ChatThreadSection } from '@/features/chat/components/ChatThreadSection'
import { useActiveConversationId } from '@/features/chat/hooks/useActiveConversationId'
import { useChatSession } from '@/features/chat/hooks/useChatSession'

/**
 * The thread of the conversation in the URL. The session key remounts it for any conversation
 * it did not create itself, so switching chats always starts from a clean thread.
 */
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
