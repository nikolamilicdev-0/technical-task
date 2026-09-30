import type { Message } from '@kb/contracts'
import { Container, Flex, ScrollArea, VisuallyHidden } from '@kb/ui'
import { type ReactNode, useRef, useState } from 'react'

import { isNotFoundError } from '@/core/api/api-error'
import { getErrorMessage } from '@/core/api/get-error-message'
import { ErrorState } from '@/core/components/states/ErrorState'
import { useT } from '@/core/i18n/useT'
import { ChatEmptyState } from '@/features/chat/components/ChatEmptyState'
import { ChatThreadHeader } from '@/features/chat/components/ChatThreadHeader'
import { Composer } from '@/features/chat/components/Composer'
import { ConversationNotFound } from '@/features/chat/components/ConversationNotFound'
import { DocumentScopePicker } from '@/features/chat/components/DocumentScopePicker'
import { IndexingNotice } from '@/features/chat/components/IndexingNotice'
import { MessageList } from '@/features/chat/components/MessageList'
import { MessagesSkeleton } from '@/features/chat/components/MessagesSkeleton'
import { StreamErrorRow } from '@/features/chat/components/StreamErrorRow'
import { StreamStatus } from '@/features/chat/components/StreamStatus'
import { StreamStoppedRow } from '@/features/chat/components/StreamStoppedRow'
import { useAutoScroll } from '@/features/chat/hooks/useAutoScroll'
import { useChatStream } from '@/features/chat/hooks/useChatStream'
import { useConversation } from '@/features/chat/hooks/useConversation'
import { buildMessageList } from '@/features/chat/lib/build-message-list'
import { isReceiving } from '@/features/chat/lib/chat-stream-reducer'
import { describeThreadTitle, getChatStrings } from '@/features/chat/lib/chat-strings'
import { getIndexingSummary } from '@/features/chat/lib/get-indexing-summary'
import { endsOnStoppedQuestion, getThreadView } from '@/features/chat/lib/get-thread-view'
import { activeScope } from '@/features/chat/lib/scope'
import { useDocuments } from '@/features/documents/hooks/useDocuments'

const NO_MESSAGES: readonly Message[] = []

interface ChatThreadSectionProps {
  initialConversationId: string | null
  onConversationCreated: (id: string) => void
}

/** One conversation, or a new chat: its messages, the answer in flight and the composer. */
export function ChatThreadSection({
  initialConversationId,
  onConversationCreated,
}: ChatThreadSectionProps) {
  const t = useT()
  const strings = getChatStrings(t)
  const stream = useChatStream(initialConversationId, onConversationCreated)
  const { status, error } = stream.state
  const conversation = useConversation(stream.conversationId, { streaming: isReceiving(status) })
  const documents = useDocuments()
  const [draft, setDraft] = useState('')
  const [scope, setScope] = useState<string[]>([])
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const { viewportRef, contentRef, scrollToBottom } = useAutoScroll()

  const indexing = getIndexingSummary(documents.data?.items)
  const documentIds = activeScope(scope, new Set(indexing.ready.map((document) => document.id)))
  const items = buildMessageList(conversation.data?.messages ?? NO_MESSAGES, stream.state)
  const view = getThreadView({
    saved: stream.conversationId !== null,
    hasData: conversation.data !== undefined,
    isError: conversation.isError,
    notFound: isNotFoundError(conversation.error),
    itemCount: items.length,
  })
  const title = describeThreadTitle(strings, view, {
    saved: stream.conversationId !== null,
    title: conversation.data?.conversation.title,
  })
  // Until the documents load, assume there are some: the prompts must not flash away.
  const hasDocuments = documents.data ? documents.data.total > 0 : true

  const submit = () => {
    if (!stream.send(draft, documentIds.length > 0 ? documentIds : undefined)) return
    setDraft('')
    scrollToBottom()
  }
  const pickPrompt = (prompt: string) => {
    setDraft(prompt)
    composerRef.current?.focus()
  }
  const retryLoad = () => void conversation.refetch()

  const errorRow =
    status === 'error' && error ? <StreamErrorRow error={error} onRetry={stream.retry} /> : null
  const stoppedRow = endsOnStoppedQuestion(status, items) ? <StreamStoppedRow /> : null
  const renderBody = (): ReactNode => {
    switch (view) {
      case 'loading':
        return (
          <Flex direction="column" role="status">
            <VisuallyHidden>{strings.thread.loading}</VisuallyHidden>
            <MessagesSkeleton />
          </Flex>
        )
      case 'error':
        return (
          <ErrorState
            title={strings.thread.errorTitle}
            description={getErrorMessage(conversation.error, t.errors)}
            onRetry={retryLoad}
          />
        )
      case 'notFound':
        return <ConversationNotFound />
      case 'empty':
        return <ChatEmptyState hasDocuments={hasDocuments} onPickPrompt={pickPrompt} />
      case 'messages':
        return (
          <Flex direction="column" gap="lg">
            <MessageList items={items} />
            {errorRow}
            {stoppedRow}
          </Flex>
        )
    }
  }

  const scopePicker = (
    <DocumentScopePicker documents={indexing.ready} selected={documentIds} onChange={setScope} />
  )
  const composer =
    view === 'error' || view === 'notFound' ? null : (
      <Container size="md" className="shrink-0 pb-4 sm:pb-6">
        <Flex direction="column" gap="sm">
          <IndexingNotice summary={indexing} />
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            onStop={stream.stop}
            status={status}
            textareaRef={composerRef}
            disabled={view === 'loading'}
            tools={scopePicker}
          />
        </Flex>
      </Container>
    )

  return (
    <Flex direction="column" className="min-h-0 flex-1">
      <ChatThreadHeader title={title} />
      <ScrollArea
        className="min-h-0 flex-1"
        viewportRef={viewportRef}
        viewportClassName="[&>div]:block!"
        viewportLabel={strings.thread.region}
      >
        <Container size="md" ref={contentRef} className="py-6">
          {renderBody()}
        </Container>
      </ScrollArea>
      {composer}
      <StreamStatus status={status} />
    </Flex>
  )
}
