'use client'

import { Button, type EmptyStateProps } from '@kb/ui'
import Link from 'next/link'

import { NotFoundState } from '@/core/components/states/NotFoundState'
import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { getChatStrings } from '@/features/chat/lib/chat-strings'

interface ConversationNotFoundProps {
  titleAs?: EmptyStateProps['titleAs']
}

/** A conversation id that names nothing (deleted, someone else's, or mistyped). */
export function ConversationNotFound({ titleAs }: ConversationNotFoundProps) {
  const strings = getChatStrings(useT())
  const newChat = (
    <Button asChild variant="outline">
      <Link href={routes.chat.index}>{strings.thread.notFound.action}</Link>
    </Button>
  )

  return (
    <NotFoundState
      title={strings.thread.notFound.title}
      description={strings.thread.notFound.description}
      action={newChat}
      titleAs={titleAs}
    />
  )
}
