import { Button, Flex, Skeleton, Text } from '@kb/ui'
import Link from 'next/link'

import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { MobileConversationsButton } from '@/features/chat/components/MobileConversationsButton'
import { getChatStrings } from '@/features/chat/lib/chat-strings'

interface ChatThreadHeaderProps {
  title: string | null
}

export function ChatThreadHeader({ title }: ChatThreadHeaderProps) {
  const strings = getChatStrings(useT())
  const NewChatIcon = icons.newChat
  const heading =
    title === null ? (
      <Skeleton className="h-5 w-48" />
    ) : (
      <Text as="h1" variant="subheading" truncate>
        {title}
      </Text>
    )

  return (
    <Flex
      as="header"
      align="center"
      gap="xs"
      className="h-14 shrink-0 border-b border-outline-variant px-2 lg:px-6"
    >
      <MobileConversationsButton />
      <Flex align="center" className="min-w-0 flex-1 px-1 lg:px-0">
        {heading}
      </Flex>
      <Button asChild variant="ghost" size="icon" className="lg:hidden">
        <Link href={routes.chat.index} aria-label={strings.newChat}>
          <NewChatIcon aria-hidden />
        </Link>
      </Button>
    </Flex>
  )
}
