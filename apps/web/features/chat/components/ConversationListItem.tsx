import type { Conversation } from '@kb/contracts'
import { Button, cn, Flex, Text } from '@kb/ui'
import Link from 'next/link'
import type { MouseEvent } from 'react'

import { routes } from '@/core/config/routes'
import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { formatConversationTime, getChatStrings } from '@/features/chat/lib/chat-strings'
import type { ConversationDialog, ConversationTarget } from '@/features/chat/types'

interface ConversationListItemProps {
  conversation: Conversation
  /** The conversation on screen. */
  active: boolean
  /** Shared clock for the relative activity time. */
  now: number
  onNavigate?: () => void
  /** Opens rename or delete; the opener gets focus back when the dialog closes. */
  onAction: (dialog: ConversationDialog, target: ConversationTarget, opener: HTMLElement) => void
}

export function ConversationListItem({
  conversation,
  active,
  now,
  onNavigate,
  onAction,
}: ConversationListItemProps) {
  const strings = getChatStrings(useT())
  const title = conversation.title ?? strings.untitled
  const target = { id: conversation.id, title: conversation.title }
  const time = formatConversationTime(strings, conversation.updatedAt, now)
  const RenameIcon = icons.rename
  const DeleteIcon = icons.delete

  // The open conversation is already on screen; following its link again would remount it.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (active) event.preventDefault()
    onNavigate?.()
  }
  const rename = (event: MouseEvent<HTMLButtonElement>) =>
    onAction('rename', target, event.currentTarget)
  const remove = (event: MouseEvent<HTMLButtonElement>) =>
    onAction('delete', target, event.currentTarget)

  return (
    <Flex
      as="li"
      align="center"
      className={cn(
        'group rounded-md transition-colors',
        active ? 'bg-primary-container' : 'hover:bg-surface-container-high'
      )}
    >
      <Link
        href={routes.chat.conversation(conversation.id)}
        aria-current={active ? 'page' : undefined}
        onClick={handleClick}
        className="min-w-0 flex-1 rounded-md px-3 py-2"
      >
        <Text as="span" variant="label" truncate className="block">
          {title}
        </Text>
        <Text as="span" variant="caption" tone="muted" className="block">
          {time}
        </Text>
      </Link>
      {/* Revealed on hover or focus with a mouse; always shown on touch screens. */}
      <Flex
        align="center"
        className="shrink-0 pe-1 pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100"
      >
        <Button
          variant="ghost"
          size="iconSm"
          aria-label={interpolate(strings.list.rename, { title })}
          onClick={rename}
        >
          <RenameIcon aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          aria-label={interpolate(strings.list.delete, { title })}
          onClick={remove}
        >
          <DeleteIcon aria-hidden />
        </Button>
      </Flex>
    </Flex>
  )
}
