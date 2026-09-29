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
      expect(getIndexingRefetchInterval([withStatus('ready'), withStatus(status)])).toBe(3_000)
    }
  )

  it('stops once every document is ready or failed', () => {
    expect(getIndexingRefetchInterval([withStatus('ready'), withStatus('failed')])).toBe(false)
  })

  it('does not poll without documents', () => {
    expect(getIndexingRefetchInterval(undefined)).toBe(false)
    expect(getIndexingRefetchInterval([])).toBe(false)
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
