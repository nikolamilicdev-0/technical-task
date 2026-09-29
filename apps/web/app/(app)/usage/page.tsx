import { Container } from '@kb/ui'
import type { Metadata } from 'next'

import { PageHeader } from '@/core/components/shell/PageHeader'
import { getDictionary } from '@/core/i18n/dictionary'

const { usage } = getDictionary()

export const metadata: Metadata = { title: usage.title }

// Header only: the usage feature fills this page in a later phase.
export default function UsagePage() {
  return (
    <Container className="py-8 md:py-10">
      <PageHeader title={usage.title} description={usage.description} />
    </Container>
  )
}
