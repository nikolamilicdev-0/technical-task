import type { DocumentSummary, EmbeddingStatus } from '@kb/contracts'
import type { QueryStatus } from '@tanstack/react-query'

import { INDEXING_POLL_INTERVAL_MS } from '@/core/config/query'

const INDEXING_STATUSES: ReadonlySet<EmbeddingStatus> = new Set(['pending', 'processing'])

export function isIndexing(status: EmbeddingStatus): boolean {
  return INDEXING_STATUSES.has(status)
}

// After a failed poll (a deleted document, the API down) only a focus or reconnect refetch
// resumes polling, instead of a request every few seconds for as long as the page stays open.
export function getIndexingRefetchInterval(
  documents: readonly Pick<DocumentSummary, 'embeddingStatus'>[] | undefined,
  status: QueryStatus
): number | false {
  if (status === 'error') return false
  const indexing = documents?.some((document) => isIndexing(document.embeddingStatus)) ?? false
  return indexing ? INDEXING_POLL_INTERVAL_MS : false
}
