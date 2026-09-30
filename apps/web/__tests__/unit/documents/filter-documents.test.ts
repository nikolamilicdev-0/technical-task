import { describe, expect, it } from 'vitest'

import { buildDocumentSummary } from '@/__tests__/fixtures/documents'
import { filterDocuments, isFilterActive } from '@/features/documents/lib/filter-documents'

const handbook = buildDocumentSummary({
  id: 'handbook',
  title: 'Onboarding Guide',
  tags: ['handbook', 'hr'],
})
const release = buildDocumentSummary({
  id: 'release',
  title: 'Release notes Q3',
  tags: ['release'],
})
const cafe = buildDocumentSummary({ id: 'cafe', title: 'Café opening hours', tags: [] })
const documents = [handbook, release, cafe]

describe('filterDocuments', () => {
  it('keeps every document for an empty filter', () => {
    expect(filterDocuments(documents, { search: '', tags: [] })).toEqual(documents)
    expect(filterDocuments(documents, { search: '   ', tags: [] })).toEqual(documents)
  })

  it('matches titles regardless of case', () => {
    expect(filterDocuments(documents, { search: 'RELEASE', tags: [] })).toEqual([release])
    expect(filterDocuments(documents, { search: 'onboarding guide', tags: [] })).toEqual([handbook])
  })

  it('matches trimmed substrings and ignores accents', () => {
    expect(filterDocuments(documents, { search: '  notes q ', tags: [] })).toEqual([release])
    expect(filterDocuments(documents, { search: 'cafe', tags: [] })).toEqual([cafe])
  })

  it('keeps documents that carry any selected tag', () => {
    expect(filterDocuments(documents, { search: '', tags: ['release'] })).toEqual([release])
    expect(filterDocuments(documents, { search: '', tags: ['hr', 'release'] })).toEqual([
      handbook,
      release,
    ])
  })

  it('requires both the search and the tags to match', () => {
    expect(filterDocuments(documents, { search: 'guide', tags: ['handbook'] })).toEqual([handbook])
    expect(filterDocuments(documents, { search: 'guide', tags: ['release'] })).toEqual([])
  })

  it('keeps the original order and leaves the input untouched', () => {
    const input = [cafe, release, handbook]
    expect(filterDocuments(input, { search: 'o', tags: [] })).toEqual([cafe, release, handbook])
    expect(input).toEqual([cafe, release, handbook])
  })
})

describe('isFilterActive', () => {
  it('is active once a search or a tag narrows the list', () => {
    expect(isFilterActive({ search: '', tags: [] })).toBe(false)
    expect(isFilterActive({ search: '  ', tags: [] })).toBe(false)
    expect(isFilterActive({ search: 'notes', tags: [] })).toBe(true)
    expect(isFilterActive({ search: '', tags: ['hr'] })).toBe(true)
  })
})
