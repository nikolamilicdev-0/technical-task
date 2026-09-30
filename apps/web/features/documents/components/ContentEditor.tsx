import type { CreateDocumentInput } from '@kb/contracts'
import { Flex, Label, Text, Textarea } from '@kb/ui'
import { type ReactNode, useId, useState } from 'react'
import { type Control, type UseFormRegisterReturn, useWatch } from 'react-hook-form'

import { MarkdownContent } from '@/core/components/markdown/MarkdownContent'
import { pluralize } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { ContentEditorTabs } from '@/features/documents/components/ContentEditorTabs'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import type { ContentEditorTab, DocumentFormValues } from '@/features/documents/types'

const PREVIEW_CLASSES =
  'min-h-96 rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3'

interface ContentEditorProps {
  control: Control<DocumentFormValues, unknown, CreateDocumentInput>
  registration: UseFormRegisterReturn<'content'>
  error?: string
}

export function ContentEditor({ control, registration, error }: ContentEditorProps) {
  const strings = getDocumentsStrings(useT())
  const baseId = useId()
  const [tab, setTab] = useState<ContentEditorTab>('write')
  const [shownError, setShownError] = useState(error)
  const content = useWatch({ control, name: 'content' })

  // A new validation error brings the textarea back, and it stays while the user fixes it.
  if (error !== shownError) {
    setShownError(error)
    if (error) setTab('write')
  }

  const tabId = (value: ContentEditorTab) => `${baseId}-tab-${value}`
  const panelId = (value: ContentEditorTab) => `${baseId}-panel-${value}`
  const textareaId = `${baseId}-textarea`
  const hintId = `${baseId}-hint`
  const errorId = `${baseId}-error`
  const describedBy = error ? `${hintId} ${errorId}` : hintId
  const lengthHint = pluralize(strings.form.contentLength, content.length)

  // Rendered only while shown: parsing a long document on every keystroke would be wasted work.
  let preview: ReactNode = null
  if (tab === 'preview') {
    preview =
      content.trim() === '' ? (
        <Text tone="muted">{strings.form.previewEmpty}</Text>
      ) : (
        <MarkdownContent content={content} />
      )
  }
  const errorText = error ? (
    <Text id={errorId} variant="caption" tone="error">
      {error}
    </Text>
  ) : null

  return (
    <Flex direction="column" gap="xs">
      <Flex align="end" justify="between" gap="sm">
        <Label htmlFor={textareaId}>{strings.form.content}</Label>
        <ContentEditorTabs active={tab} onChange={setTab} tabId={tabId} panelId={panelId} />
      </Flex>
      <div
        role="tabpanel"
        id={panelId('write')}
        aria-labelledby={tabId('write')}
        hidden={tab !== 'write'}
      >
        <Textarea
          id={textareaId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          placeholder={strings.form.contentPlaceholder}
          className="h-96 font-mono"
          {...registration}
        />
      </div>
      <div
        role="tabpanel"
        id={panelId('preview')}
        aria-labelledby={tabId('preview')}
        hidden={tab !== 'preview'}
        tabIndex={0}
        className={PREVIEW_CLASSES}
      >
        {preview}
      </div>
      <Text id={hintId} variant="caption" tone="muted">
        {lengthHint}
      </Text>
      {errorText}
    </Flex>
  )
}
