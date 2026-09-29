import type { Document } from '@kb/contracts'
import { Button, Card, Flex, Text } from '@kb/ui'
import { useRef } from 'react'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { DocumentStatusBadge } from '@/features/documents/components/DocumentStatusBadge'
import { useReindexDocument } from '@/features/documents/hooks/useDocumentMutations'
import { describeIndexing, getDocumentsStrings } from '@/features/documents/lib/documents-strings'

interface DocumentStatusBarProps {
  document: Document
  /** Shared clock for the retry schedule. */
  now: number
}

/** Where the document stands in indexing, with a retry once indexing has failed. */
export function DocumentStatusBar({ document, now }: DocumentStatusBarProps) {
  const strings = getDocumentsStrings(useT())
  const reindex = useReindexDocument(document.id)
  const sectionRef = useRef<HTMLElement>(null)
  const { summary, error, retry } = describeIndexing(strings, document, now)
  const ReindexIcon = icons.reindex

  // The button goes away once the document is queued, so focus moves to the status it updates.
  const retryIndexing = () => {
    sectionRef.current?.focus()
    reindex.mutate()
  }

  const errorText = error ? (
    <Text variant="caption" tone="error" className="break-words">
      {error}
    </Text>
  ) : null
  const retryText = retry ? (
    <Text variant="caption" tone="muted">
      {retry}
    </Text>
  ) : null
  const reindexButton =
    document.embeddingStatus === 'failed' ? (
      <Button
        variant="outline"
        size="sm"
        loading={reindex.isPending}
        onClick={retryIndexing}
        className="self-start sm:self-center"
      >
        <ReindexIcon aria-hidden />
        {strings.statusBar.reindex}
      </Button>
    ) : null

  return (
    <Card
      as="section"
      ref={sectionRef}
      tabIndex={-1}
      padding="sm"
      aria-label={strings.statusBar.label}
    >
      <Flex direction={{ base: 'column', sm: 'row' }} justify="between" gap="sm">
        <Flex align="start" gap="sm" className="min-w-0">
          <DocumentStatusBadge status={document.embeddingStatus} className="mt-0.5 shrink-0" />
          <Flex direction="column" gap="xs" className="min-w-0">
            <Text role="status">{summary}</Text>
            {errorText}
            {retryText}
          </Flex>
        </Flex>
        {reindexButton}
      </Flex>
    </Card>
  )
}
