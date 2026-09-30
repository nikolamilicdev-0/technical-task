// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { buildDocumentSummary } from '@/__tests__/fixtures/documents'
import { getIndexingSummary } from '@/features/chat/lib/get-indexing-summary'

describe('getIndexingSummary', () => {
  it('is empty before the documents have loaded', () => {
    expect(getIndexingSummary(undefined)).toEqual({ indexing: 0, failed: [], ready: [], total: 0 })
  })

  it('counts queued and running indexing, lists failures and keeps the ready documents', () => {
    const ready = buildDocumentSummary({ id: 'ready-1' })
    const summary = getIndexingSummary([
      ready,
      buildDocumentSummary({ id: 'pending-1', embeddingStatus: 'pending' }),
      buildDocumentSummary({ id: 'processing-1', embeddingStatus: 'processing' }),
      buildDocumentSummary({ id: 'failed-1', title: 'Scan', embeddingStatus: 'failed' }),
    ])
    expect(summary).toEqual({
      indexing: 2,
      failed: [{ id: 'failed-1', title: 'Scan' }],
      ready: [ready],
      total: 4,
    })
  })
})
