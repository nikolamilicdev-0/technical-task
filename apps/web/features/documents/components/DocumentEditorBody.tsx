import { idSchema } from '@kb/contracts'
import type { ReactNode } from 'react'

import { NotFoundState } from '@/core/components/states/NotFoundState'
import { getDictionary } from '@/core/i18n/dictionary'
import { DocumentEditorClient } from '@/features/documents/components/DocumentEditorClient'
import { DocumentEditorSkeleton } from '@/features/documents/components/DocumentEditorSkeleton'
import { DocumentPageShell } from '@/features/documents/components/DocumentPageShell'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

type DocumentEditorBodyProps = { id: string; loading?: false } | { id?: undefined; loading: true }

export function DocumentEditorBody(props: DocumentEditorBodyProps) {
  const strings = getDocumentsStrings(getDictionary())

  // An id that is not a UUID cannot name a document, so it never reaches the API.
  let content: ReactNode
  if (props.loading) {
    content = <DocumentEditorSkeleton label={strings.editor.loading} />
  } else if (idSchema.safeParse(props.id).success) {
    content = <DocumentEditorClient id={props.id} />
  } else {
    content = (
      <NotFoundState
        title={strings.editor.notFound.title}
        description={strings.editor.notFound.description}
        titleAs="h1"
      />
    )
  }

  return <DocumentPageShell>{content}</DocumentPageShell>
}
