import type { Metadata } from 'next'

import { getDictionary } from '@/core/i18n/dictionary'
import { DocumentCreateBody } from '@/features/documents/components/DocumentCreateBody'

export const metadata: Metadata = { title: getDictionary().documents.create.metaTitle }

export default function NewDocumentPage() {
  return <DocumentCreateBody />
}
