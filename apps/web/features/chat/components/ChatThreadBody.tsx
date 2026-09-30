import { idSchema } from '@kb/contracts'
import { Flex } from '@kb/ui'

import { getDictionary } from '@/core/i18n/dictionary'
import { ChatThreadClient } from '@/features/chat/components/ChatThreadClient'
import { ChatThreadSkeleton } from '@/features/chat/components/ChatThreadSkeleton'
import { ConversationNotFound } from '@/features/chat/components/ConversationNotFound'
import { getChatStrings } from '@/features/chat/lib/chat-strings'

type ChatThreadBodyProps =
  { conversationId: string | null; loading?: false } | { conversationId?: undefined; loading: true }

export function ChatThreadBody(props: ChatThreadBodyProps) {
  const strings = getChatStrings(getDictionary())
  if (props.loading) return <ChatThreadSkeleton label={strings.thread.loading} />

  // An id that is not a UUID cannot name a conversation, so it never reaches the API.
  if (props.conversationId !== null && !idSchema.safeParse(props.conversationId).success) {
    return (
      <Flex direction="column" justify="center" className="min-h-0 flex-1">
        <ConversationNotFound titleAs="h1" />
      </Flex>
    )
  }
  return <ChatThreadClient />
}
