import { Container, Flex } from '@kb/ui'

import { PageHeader } from '@/core/components/shell/PageHeader'
import { getDictionary } from '@/core/i18n/dictionary'
import { DocumentsListClient } from '@/features/documents/components/DocumentsListClient'
import { DocumentsListSkeleton } from '@/features/documents/components/DocumentsListSkeleton'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

interface DocumentsListBodyProps {
  loading?: boolean
}

export function DocumentsListBody({ loading = false }: DocumentsListBodyProps) {
  const strings = getDocumentsStrings(getDictionary())
  const content = loading ? (
    <DocumentsListSkeleton label={strings.list.loading} />
  ) : (
    <DocumentsListClient />
  )

  return (
    <Container className="py-8 md:py-10">
      <Flex direction="column" gap="lg">
        <PageHeader title={strings.title} description={strings.description} />
        {content}
      </Flex>
    </Container>
  )
}
