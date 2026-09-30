'use client'

import { Button, EmptyState, Flex, ScrollArea, Text } from '@kb/ui'
import Link from 'next/link'
import { type ReactNode, useId, useRef, useState } from 'react'

import { getErrorMessage } from '@/core/api/get-error-message'
import { ConfirmDialog } from '@/core/components/dialogs/ConfirmDialog'
import { ErrorState } from '@/core/components/states/ErrorState'
import { routes } from '@/core/config/routes'
import { useNow } from '@/core/hooks/useNow'
import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { ConversationListItem } from '@/features/chat/components/ConversationListItem'
import { ConversationListSkeleton } from '@/features/chat/components/ConversationListSkeleton'
import { RenameConversationDialog } from '@/features/chat/components/RenameConversationDialog'
import { LIST_TIME_REFRESH_MS } from '@/features/chat/constants'
import { useActiveConversationId } from '@/features/chat/hooks/useActiveConversationId'
import { useDeleteConversation } from '@/features/chat/hooks/useConversationMutations'
import { useConversations } from '@/features/chat/hooks/useConversations'
import { getChatStrings } from '@/features/chat/lib/chat-strings'
import type { ConversationDialog, ConversationTarget } from '@/features/chat/types'

interface DialogState {
  open: ConversationDialog | null
  /** Kept after closing, so the dialog keeps its text while it animates out. */
  target: ConversationTarget | null
}

interface ConversationListClientProps {
  /** Called after picking a conversation or starting a new chat, e.g. to close a drawer. */
  onNavigate?: () => void
  /** Off inside the drawer, whose own title already names the list. */
  showTitle?: boolean
}

/** Every conversation, most recently active first, with new chat, rename and delete. */
export function ConversationListClient({
  onNavigate,
  showTitle = true,
}: ConversationListClientProps) {
  const t = useT()
  const strings = getChatStrings(t)
  const query = useConversations()
  const activeId = useActiveConversationId()
  const now = useNow(LIST_TIME_REFRESH_MS)
  const remove = useDeleteConversation()
  const headingId = useId()
  const [dialog, setDialog] = useState<DialogState>({ open: null, target: null })
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const newChatRef = useRef<HTMLAnchorElement>(null)
  const NewChatIcon = icons.newChat

  const openDialog = (
    open: ConversationDialog,
    target: ConversationTarget,
    opener: HTMLElement
  ) => {
    returnFocusRef.current = opener
    setDialog({ open, target })
  }
  const closeDialog = () => setDialog((current) => ({ ...current, open: null }))
  const handleConfirmOpenChange = (open: boolean) => {
    if (!open) closeDialog()
  }
  // The dialogs have no trigger: focus returns to the opener, or to "New chat" once it is gone.
  const restoreFocus = (event: Event) => {
    event.preventDefault()
    const opener = returnFocusRef.current
    const next = opener?.isConnected ? opener : newChatRef.current
    next?.focus()
  }
  const confirmDelete = () => {
    if (!dialog.target) return
    returnFocusRef.current = newChatRef.current
    remove.mutate(dialog.target.id)
    closeDialog()
  }
  const retry = () => void query.refetch()

  const renderList = (): ReactNode => {
    if (!query.data) {
      if (!query.isError) return <ConversationListSkeleton label={strings.list.loading} />
      return (
        <ErrorState
          title={strings.list.errorTitle}
          description={getErrorMessage(query.error, t.errors)}
          onRetry={retry}
          titleAs="h3"
        />
      )
    }
    const { items, total } = query.data
    if (items.length === 0) {
      return (
        <EmptyState
          title={strings.list.empty.title}
          description={strings.list.empty.description}
          titleAs="h3"
          className="py-10"
        />
      )
    }
    const rows = items.map((conversation) => (
      <ConversationListItem
        key={conversation.id}
        conversation={conversation}
        active={conversation.id === activeId}
        now={now}
        onNavigate={onNavigate}
        onAction={openDialog}
      />
    ))
    const truncated =
      total > items.length ? (
        <Text variant="caption" tone="muted" className="px-3 py-2">
          {interpolate(strings.list.truncated, { shown: items.length })}
        </Text>
      ) : null
    return (
      <>
        <Flex as="ul" direction="column" gap="xs">
          {rows}
        </Flex>
        {truncated}
      </>
    )
  }

  const deleteTitle = interpolate(strings.delete.confirmTitle, {
    title: dialog.target?.title ?? strings.untitled,
  })

  return (
    <Flex as="nav" direction="column" aria-labelledby={headingId} className="min-h-0 flex-1">
      <Flex align="center" justify="between" gap="sm" className="shrink-0 px-3 pt-4 pb-2">
        <Text
          as="h2"
          id={headingId}
          variant="label"
          tone="muted"
          className={showTitle ? undefined : 'sr-only'}
        >
          {strings.list.title}
        </Text>
        <Button asChild variant="outline" size="sm">
          <Link ref={newChatRef} href={routes.chat.index} onClick={onNavigate}>
            <NewChatIcon aria-hidden />
            {strings.newChat}
          </Link>
        </Button>
      </Flex>
      <ScrollArea className="min-h-0 flex-1" viewportClassName="[&>div]:block!">
        <Flex direction="column" className="px-2 pb-4">
          {renderList()}
        </Flex>
      </ScrollArea>
      <ConfirmDialog
        open={dialog.open === 'delete'}
        onOpenChange={handleConfirmOpenChange}
        title={deleteTitle}
        description={strings.delete.confirmDescription}
        confirmLabel={strings.delete.confirm}
        onConfirm={confirmDelete}
        onCloseAutoFocus={restoreFocus}
      />
      <RenameConversationDialog
        open={dialog.open === 'rename'}
        target={dialog.target}
        onClose={closeDialog}
        onCloseAutoFocus={restoreFocus}
      />
    </Flex>
  )
}
