import { Flex } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { MessageBubble } from '@/features/chat/components/MessageBubble'
import { getChatStrings } from '@/features/chat/lib/chat-strings'
import type { MessageItem } from '@/features/chat/types'

interface MessageListProps {
  items: readonly MessageItem[]
}

/** The conversation in order, oldest first, ending with the answer in flight. */
export function MessageList({ items }: MessageListProps) {
  const strings = getChatStrings(useT())
  const bubbles = items.map(({ key, ...item }) => <MessageBubble key={key} {...item} />)

  return (
    <Flex as="ol" direction="column" gap="xl" aria-label={strings.thread.messages}>
      {bubbles}
    </Flex>
  )
}
