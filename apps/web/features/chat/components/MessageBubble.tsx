import { Flex, Text, VisuallyHidden } from '@kb/ui'
import { memo, useCallback, useId, useMemo, useState } from 'react'
import type { Components } from 'react-markdown'

import { MarkdownContent } from '@/core/components/markdown/MarkdownContent'
import { useT } from '@/core/i18n/useT'
import { CitationLink } from '@/features/chat/components/CitationLink'
import { SourcesList } from '@/features/chat/components/SourcesList'
import { StreamingCursor } from '@/features/chat/components/StreamingCursor'
import { CitationContext } from '@/features/chat/lib/citation-context'
import {
  describeFinish,
  describeProgress,
  describeUsage,
  getChatStrings,
} from '@/features/chat/lib/chat-strings'
import { linkifyCitations } from '@/features/chat/lib/citations'
import type { CitationActions, MessageItem, SourceFocusRequest } from '@/features/chat/types'

const ANSWER_COMPONENTS: Components = { a: CitationLink }

type MessageBubbleProps = Omit<MessageItem, 'key'>

/** Memoised, so stored answers stay put while a new one streams. */
export const MessageBubble = memo(function MessageBubble({
  author,
  content,
  citations,
  streaming,
  finishReason,
  usage,
}: MessageBubbleProps) {
  const strings = getChatStrings(useT())
  const sourcesId = useId()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [focusRequest, setFocusRequest] = useState<SourceFocusRequest | null>(null)
  const revealSource = useCallback((index: number) => {
    setSourcesOpen(true)
    setFocusRequest({ index })
  }, [])
  const citationActions = useMemo<CitationActions>(
    () => ({ citations, sourcesId, revealSource }),
    [citations, sourcesId, revealSource]
  )

  if (author === 'user') {
    return (
      <Flex as="li" justify="end">
        <Flex
          direction="column"
          className="max-w-[85%] rounded-2xl rounded-ee-sm bg-secondary-container px-4 py-2.5 text-on-secondary-container"
        >
          <VisuallyHidden>{strings.message.question}</VisuallyHidden>
          <Text tone="inherit" className="break-words whitespace-pre-wrap">
            {content}
          </Text>
        </Flex>
      </Flex>
    )
  }

  const waiting = streaming && content === ''
  const body = waiting ? (
    <Flex align="center" gap="sm" className="h-7">
      <StreamingCursor />
      <Text variant="caption" tone="muted">
        {describeProgress(strings, citations)}
      </Text>
    </Flex>
  ) : (
    <CitationContext value={citationActions}>
      <MarkdownContent
        content={linkifyCitations(content, citations.length)}
        components={ANSWER_COMPONENTS}
      />
    </CitationContext>
  )
  const cursor = streaming && !waiting ? <StreamingCursor /> : null
  const finishNote = describeFinish(strings, finishReason)
  const usageNote = usage && !streaming ? describeUsage(strings, usage) : null
  const finishText = finishNote ? (
    <Text variant="caption" tone="muted">
      {finishNote}
    </Text>
  ) : null
  const usageText = usageNote ? (
    <Text variant="caption" tone="muted" className="tabular-nums">
      {usageNote}
    </Text>
  ) : null
  const notes =
    finishText || usageText ? (
      <Flex wrap align="center" gap="md">
        {finishText}
        {usageText}
      </Flex>
    ) : null
  const sources =
    citations.length > 0 ? (
      <SourcesList
        id={sourcesId}
        citations={citations}
        open={sourcesOpen}
        onOpenChange={setSourcesOpen}
        focusRequest={focusRequest}
      />
    ) : null

  return (
    <Flex as="li" direction="column" gap="sm" aria-busy={streaming || undefined}>
      <VisuallyHidden>{strings.message.answer}</VisuallyHidden>
      {body}
      {cursor}
      {notes}
      {sources}
    </Flex>
  )
})
