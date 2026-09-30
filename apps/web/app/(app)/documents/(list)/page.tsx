import type { Metadata } from 'next'

import { getDictionary } from '@/core/i18n/dictionary'
import { DocumentsListBody } from '@/features/documents/components/DocumentsListBody'

export const metadata: Metadata = { title: getDictionary().documents.title }

export default function DocumentsPage() {
  return <DocumentsListBody />
}
