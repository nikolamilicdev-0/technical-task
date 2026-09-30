import { describe, expect, it } from 'vitest'

import { buildDocumentSummary } from '@/__tests__/fixtures/documents'
import { collectTags } from '@/features/documents/lib/collect-tags'

const withTags = (...tags: string[]) => buildDocumentSummary({ tags })

describe('collectTags', () => {
  it('lists every tag once, in alphabetical order', () => {
    const documents = [withTags('release', 'q3'), withTags('handbook', 'release'), withTags()]
    expect(collectTags(documents)).toEqual(['handbook', 'q3', 'release'])
  })

  it('sorts without regard to case and with numbers in numeric order', () => {
    expect(collectTags([withTags('q10', 'beta', 'q2', 'Alpha')])).toEqual([
      'Alpha',
      'beta',
      'q2',
      'q10',
    ])
  })

  it('keeps tags that differ in case apart, as the API stores them', () => {
    expect(collectTags([withTags('Q3'), withTags('q3')])).toHaveLength(2)
  })

  it('returns an empty list without documents', () => {
    expect(collectTags([])).toEqual([])
  })
})
