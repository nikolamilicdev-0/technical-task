'use client'

import { Flex, Text } from '@kb/ui'
import { type ReactNode, useRef, useState } from 'react'

import { getErrorMessage } from '@/core/api/get-error-message'
import { ErrorState } from '@/core/components/states/ErrorState'
import { useT } from '@/core/i18n/useT'
import { DocumentsEmpty } from '@/features/documents/components/DocumentsEmpty'
import { DocumentsGrid } from '@/features/documents/components/DocumentsGrid'
import { DocumentsListSkeleton } from '@/features/documents/components/DocumentsListSkeleton'
import { DocumentsToolbar } from '@/features/documents/components/DocumentsToolbar'
import { UploadDocumentDialog } from '@/features/documents/components/UploadDocumentDialog'
import { useDocumentsList } from '@/features/documents/hooks/useDocumentsList'
import { describeListCount, getDocumentsStrings } from '@/features/documents/lib/documents-strings'

/** The documents page below its header: loading, error, empty, filtered and full states. */
export function DocumentsListClient() {
  const t = useT()
  const strings = getDocumentsStrings(t)
  const list = useDocumentsList()
  const [uploadOpen, setUploadOpen] = useState(false)
  const uploadButtonRef = useRef<HTMLButtonElement>(null)
  const openUpload = () => setUploadOpen(true)
  // A first upload swaps the empty state (and its button) for the toolbar, so focus lands on the
  // toolbar's Upload button; with no toolbar yet the dialog returns focus to its opener.
  const focusUploadButton = (event: Event) => {
    if (!uploadButtonRef.current) return
    event.preventDefault()
    uploadButtonRef.current.focus()
  }

  const renderResults = (): ReactNode => {
    const { count, note } = describeListCount(strings, {
      shown: list.visible.length,
      loaded: list.loadedCount,
      total: list.total,
      filtering: list.filtering,
    })
    const results =
      list.view === 'noMatches' ? (
        <DocumentsEmpty variant="noMatches" onClearFilters={list.clearFilters} />
      ) : (
        <DocumentsGrid documents={list.visible} />
      )
    const truncationNote = note ? (
      <Text variant="caption" tone="muted">
        {note}
      </Text>
    ) : null
    return (
      <Flex direction="column" gap="md">
        <DocumentsToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          tags={list.tags}
          selectedTags={list.selectedTags}
          onSelectedTagsChange={list.setSelectedTags}
          onUpload={openUpload}
          uploadButtonRef={uploadButtonRef}
        />
        <Flex direction="column" gap="xs">
          <Text variant="caption" tone="muted" role="status">
            {count}
          </Text>
          {truncationNote}
        </Flex>
        {results}
      </Flex>
    )
  }

  const renderContent = (): ReactNode => {
    switch (list.view) {
      case 'loading':
        return <DocumentsListSkeleton label={strings.list.loading} />
      case 'error':
        return (
          <ErrorState
            title={strings.list.errorTitle}
            description={getErrorMessage(list.error, t.errors)}
            onRetry={list.retry}
          />
        )
      case 'empty':
        return <DocumentsEmpty variant="none" onUpload={openUpload} />
      case 'results':
      case 'noMatches':
        return renderResults()
    }
  }

  return (
    <>
      {renderContent()}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onCloseAutoFocus={focusUploadButton}
      />
    </>
  )
}
