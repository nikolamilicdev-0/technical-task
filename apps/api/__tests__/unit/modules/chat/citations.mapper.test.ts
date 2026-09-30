import { describe, expect, it } from 'vitest'

import { markCited, toCitations, toExcerpt } from '../../../../src/modules/chat/citations.mapper.js'
import { buildRetrievedChunk } from '../../../fixtures/chat.js'
import { TEST_DOCUMENT_ID } from '../../../fixtures/documents.js'

const SOURCES = [
  buildRetrievedChunk('plans', { similarity: 0.81, fusedScore: 0.032, chunkIndex: 3 }),
  buildRetrievedChunk('refunds', { fusedScore: 0.016 }),
]

describe('toCitations', () => {
  it('numbers the sources in prompt order, none cited yet', () => {
    expect(toCitations(SOURCES, 'hybrid')).toEqual([
      {
        index: 1,
        documentId: TEST_DOCUMENT_ID,
        documentTitle: 'Pricing',
        chunkId: 'chunk-plans',
        chunkIndex: 3,
        headingPath: 'Pricing › plans',
        excerpt: 'Content of plans.',
        score: 0.032,
        cited: false,
      },
      expect.objectContaining({ index: 2, chunkId: 'chunk-refunds', score: 0.016 }),
    ])
  })

  it('scores by cosine similarity in vector mode', () => {
    const [plans, refunds] = toCitations(SOURCES, 'vector')

    expect(plans?.score).toBe(0.81)
    expect(refunds?.score).toBe(0.016)
  })
})

describe('markCited', () => {
  it('flags exactly the sources the answer cites', () => {
    const citations = toCitations(SOURCES, 'hybrid')

    const marked = markCited(citations, 'Refunds take a week [2]. Unknown source [9].')

    expect(marked.map(({ index, cited }) => [index, cited])).toEqual([
      [1, false],
      [2, true],
    ])
    expect(citations.every(({ cited }) => !cited)).toBe(true)
  })
})

describe('toExcerpt', () => {
  it('puts the chunk on one line and cuts it at 240 code points', () => {
    const excerpt = toExcerpt(`# Plans\n\n  ${'é'.repeat(300)}`)

    expect(excerpt.startsWith('# Plans é')).toBe(true)
    expect(Array.from(excerpt)).toHaveLength(240)
  })
})
