'use client'

import { useT } from '@/core/i18n/useT'
import { DocumentForm } from '@/features/documents/components/DocumentForm'
import { EMPTY_DOCUMENT_FORM_VALUES } from '@/features/documents/constants'
import { useCreateDocument } from '@/features/documents/hooks/useDocumentMutations'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

export function DocumentCreateClient() {
  const strings = getDocumentsStrings(useT())
  const create = useCreateDocument()

  // After success the page is on its way to the editor, so the form stays busy.
  return (
    <DocumentForm
      defaultValues={EMPTY_DOCUMENT_FORM_VALUES}
      submitLabel={strings.form.create}
      onSubmit={create.mutateAsync}
      busy={create.isSuccess}
    />
  )
}
