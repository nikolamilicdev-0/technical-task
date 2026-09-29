import type { Metadata } from 'next'

import { getDictionary } from '@/core/i18n/dictionary'
import { DocumentEditorBody } from '@/features/documents/components/DocumentEditorBody'

export const metadata: Metadata = { title: getDictionary().documents.editor.metaTitle }

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DocumentEditorBody id={id} />
}
