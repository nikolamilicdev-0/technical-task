import type { DocumentSummary } from '@kb/contracts'

import type { IndexingSummary } from '@/features/chat/types'
import { isIndexing } from '@/features/documents/lib/get-refetch-interval'

export function getIndexingSummary(
  documents: readonly DocumentSummary[] | undefined
): IndexingSummary {
  const loaded = documents ?? []
  return {
    indexing: loaded.filter((document) => isIndexing(document.embeddingStatus)).length,
    failed: loaded
      .filter((document) => document.embeddingStatus === 'failed')
      .map(({ id, title }) => ({ id, title })),
    ready: loaded.filter((document) => document.embeddingStatus === 'ready'),
    total: loaded.length,
  }
}
