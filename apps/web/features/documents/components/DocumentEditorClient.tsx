'use client'

import type { CreateDocumentInput } from '@kb/contracts'
import { Flex } from '@kb/ui'

import { isNotFoundError } from '@/core/api/api-error'
import { getErrorMessage } from '@/core/api/get-error-message'
import { PageHeader } from '@/core/components/shell/PageHeader'
import { ErrorState } from '@/core/components/states/ErrorState'
import { NotFoundState } from '@/core/components/states/NotFoundState'
import { useNow } from '@/core/hooks/useNow'
import { useT } from '@/core/i18n/useT'
import { DocumentDangerZone } from '@/features/documents/components/DocumentDangerZone'
import { DocumentEditorSkeleton } from '@/features/documents/components/DocumentEditorSkeleton'
import { DocumentForm } from '@/features/documents/components/DocumentForm'
import { DocumentStatusBar } from '@/features/documents/components/DocumentStatusBar'
import { RELATIVE_TIME_REFRESH_MS } from '@/features/documents/constants'
import { useDocument } from '@/features/documents/hooks/useDocument'
import { useUpdateDocument } from '@/features/documents/hooks/useDocumentMutations'
import { formatDocumentMeta, getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import { toFormValues } from '@/features/documents/lib/to-form-values'
import { hasChanges, toUpdateInput } from '@/features/documents/lib/to-update-input'

interface DocumentEditorClientProps {
  id: string
}

/** One document: indexing status, the edit form and deletion. */
export function DocumentEditorClient({ id }: DocumentEditorClientProps) {
  const t = useT()
  const strings = getDocumentsStrings(t)
  const documentQuery = useDocument(id)
  const update = useUpdateDocument(id)
  const now = useNow(RELATIVE_TIME_REFRESH_MS)
  const { data: document, error } = documentQuery

  // Checked first: a document deleted elsewhere can still be cached here.
  if (isNotFoundError(error)) {
    return (
      <NotFoundState
        title={strings.editor.notFound.title}
        description={strings.editor.notFound.description}
        titleAs="h1"
      />
    )
  }
  if (!document) {
    if (!documentQuery.isError) return <DocumentEditorSkeleton label={strings.editor.loading} />
    const retry = () => void documentQuery.refetch()
    return (
      <ErrorState
        title={strings.editor.errorTitle}
        description={getErrorMessage(error, t.errors)}
        onRetry={retry}
        titleAs="h1"
      />
    )
  }

  const meta = formatDocumentMeta(strings, document, now)
  // Only changed fields are sent; a submit that changes nothing just marks the form clean.
  const save = async (values: CreateDocumentInput) => {
    const input = toUpdateInput(values, document)
    if (hasChanges(input)) await update.mutateAsync(input)
  }

  return (
    <Flex direction="column" gap="lg">
      <PageHeader title={document.title} description={meta} />
      <DocumentStatusBar document={document} now={now} />
      <DocumentForm
        key={document.id}
        defaultValues={toFormValues(document)}
        submitLabel={strings.form.save}
        onSubmit={save}
        editing
      />
      <DocumentDangerZone document={document} />
    </Flex>
  )
}
