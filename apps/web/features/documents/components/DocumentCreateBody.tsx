import { PageHeader } from '@/core/components/shell/PageHeader'
import { getDictionary } from '@/core/i18n/dictionary'
import { DocumentCreateClient } from '@/features/documents/components/DocumentCreateClient'
import { DocumentFormSkeleton } from '@/features/documents/components/DocumentFormSkeleton'
import { DocumentPageShell } from '@/features/documents/components/DocumentPageShell'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

interface DocumentCreateBodyProps {
  /** The route's loading state: the real header over a form placeholder. */
  loading?: boolean
}

export function DocumentCreateBody({ loading = false }: DocumentCreateBodyProps) {
  const dictionary = getDictionary()
  const strings = getDocumentsStrings(dictionary)
  const form = loading ? (
    <DocumentFormSkeleton label={dictionary.common.loading} />
  ) : (
    <DocumentCreateClient />
  )

  return (
    <DocumentPageShell>
      <PageHeader title={strings.create.title} description={strings.create.description} />
      {form}
    </DocumentPageShell>
  )
}
