import { Container } from '@kb/ui'
import type { Metadata } from 'next'

import { PageHeader } from '@/core/components/shell/PageHeader'
import { getDictionary } from '@/core/i18n/dictionary'

const { documents } = getDictionary()

export const metadata: Metadata = { title: documents.title }

// Header only: the documents feature fills this page in the next phase.
export default function DocumentsPage() {
  return (
    <Container className="py-8 md:py-10">
      <PageHeader title={documents.title} description={documents.description} />
    </Container>
  )
}
