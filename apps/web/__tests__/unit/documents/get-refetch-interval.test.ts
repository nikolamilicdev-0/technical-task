import type { EmbeddingStatus } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { buildDocumentSummary } from '@/__tests__/fixtures/documents'
import {
  getIndexingRefetchInterval,
  isIndexing,
} from '@/features/documents/lib/get-refetch-interval'

const withStatus = (embeddingStatus: EmbeddingStatus) => buildDocumentSummary({ embeddingStatus })

describe('getIndexingRefetchInterval', () => {
  it.each(['pending', 'processing'] as const)(
    'polls every 3 s while a document is %s',
    (status) => {
      const documents = [withStatus('ready'), withStatus(status)]
      expect(getIndexingRefetchInterval(documents, 'success')).toBe(3_000)
    }
  )

  it('stops once every document is ready or failed', () => {
    const documents = [withStatus('ready'), withStatus('failed')]
    expect(getIndexingRefetchInterval(documents, 'success')).toBe(false)
  })

  it('does not poll without documents', () => {
    expect(getIndexingRefetchInterval(undefined, 'pending')).toBe(false)
    expect(getIndexingRefetchInterval([], 'success')).toBe(false)
  })

  it('stops polling after a failed fetch, even while cached documents are indexing', () => {
    expect(getIndexingRefetchInterval([withStatus('processing')], 'error')).toBe(false)
  })
})

describe('isIndexing', () => {
  it.each([
    ['pending', true],
    ['processing', true],
    ['ready', false],
    ['failed', false],
  ] as const)('%s → %s', (status, expected) => {
    expect(isIndexing(status)).toBe(expected)
  })
})
