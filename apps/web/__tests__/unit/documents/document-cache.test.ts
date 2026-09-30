import { describe, expect, it } from 'vitest'

import {
  buildDocument,
  buildDocumentList,
  buildDocumentSummary,
} from '@/__tests__/fixtures/documents'
import {
  applyDocumentUpdate,
  removeFromList,
  updateInList,
  withPendingStatus,
} from '@/features/documents/lib/document-cache'

describe('withPendingStatus', () => {
  it('queues the document again and clears the last error', () => {
    const failed = buildDocumentSummary({ embeddingStatus: 'failed', embeddingError: 'Timeout' })
    expect(withPendingStatus(failed)).toMatchObject({
      embeddingStatus: 'pending',
      embeddingError: null,
    })
  })
})

describe('applyDocumentUpdate', () => {
  const ready = buildDocument({ title: 'Notes', content: '# Notes', tags: ['a'] })

  it('re-queues the document when its title or content changes', () => {
    expect(applyDocumentUpdate(ready, { title: 'New title' })).toMatchObject({
      title: 'New title',
      embeddingStatus: 'pending',
    })
    expect(applyDocumentUpdate(ready, { content: '# Changed' })).toMatchObject({
      content: '# Changed',
      embeddingStatus: 'pending',
    })
  })

  it('keeps the status for a tags-only change', () => {
    expect(applyDocumentUpdate(ready, { tags: ['a', 'b'] })).toMatchObject({
      tags: ['a', 'b'],
      embeddingStatus: 'ready',
    })
  })

  it('keeps the status when the text is resent unchanged', () => {
    expect(applyDocumentUpdate(ready, { title: 'Notes' }).embeddingStatus).toBe('ready')
  })
})

describe('removeFromList', () => {
  const first = buildDocumentSummary({ id: 'first' })
  const second = buildDocumentSummary({ id: 'second' })

  it('drops the document and counts one fewer', () => {
    expect(removeFromList(buildDocumentList([first, second], 5), 'first')).toMatchObject({
      items: [second],
      total: 4,
    })
  })

  it('returns the same list when the document is not in it', () => {
    const list = buildDocumentList([first])
    expect(removeFromList(list, 'missing')).toBe(list)
  })
})

describe('updateInList', () => {
  it('updates only the matching document', () => {
    const first = buildDocumentSummary({ id: 'first', embeddingStatus: 'failed' })
    const second = buildDocumentSummary({ id: 'second', embeddingStatus: 'failed' })
    const updated = updateInList(buildDocumentList([first, second]), 'second', withPendingStatus)
    expect(updated.items.map((item) => item.embeddingStatus)).toEqual(['failed', 'pending'])
  })
})
