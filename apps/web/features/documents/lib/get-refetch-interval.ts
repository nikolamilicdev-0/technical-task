import type { DocumentSummary, EmbeddingStatus } from '@kb/contracts'

import { INDEXING_POLL_INTERVAL_MS } from '@/core/config/query'

const INDEXING_STATUSES: ReadonlySet<EmbeddingStatus> = new Set(['pending', 'processing'])

/** Queued or being indexed right now; ready and failed documents stay as they are. */
export function isIndexing(status: EmbeddingStatus): boolean {
  return INDEXING_STATUSES.has(status)
}

/** `refetchInterval` for document queries: poll while any document is still being indexed. */
export function getIndexingRefetchInterval(
  documents: readonly Pick<DocumentSummary, 'embeddingStatus'>[] | undefined
): number | false {
  const indexing = documents?.some((document) => isIndexing(document.embeddingStatus)) ?? false
  return indexing ? INDEXING_POLL_INTERVAL_MS : false
}
