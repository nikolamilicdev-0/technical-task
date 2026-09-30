import type { DocumentSummary } from '@kb/contracts'
import { Grid } from '@kb/ui'

import { useNow } from '@/core/hooks/useNow'
import { DocumentCard } from '@/features/documents/components/DocumentCard'
import { DOCUMENT_GRID_COLUMNS } from '@/features/documents/constants'

interface DocumentsGridProps {
  documents: readonly DocumentSummary[]
}

export function DocumentsGrid({ documents }: DocumentsGridProps) {
  const now = useNow()
  const cards = documents.map((document) => (
    <DocumentCard key={document.id} document={document} now={now} />
  ))

  return (
    <Grid as="ul" columns={DOCUMENT_GRID_COLUMNS} gap="md">
      {cards}
    </Grid>
  )
}
