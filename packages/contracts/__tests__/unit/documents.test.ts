import {
  createDocumentSchema,
  DOCUMENT_CONTENT_MAX,
  DOCUMENT_TITLE_MAX,
  documentListSchema,
  documentSchema,
  documentSummarySchema,
  listDocumentsQuerySchema,
  MAX_TAGS,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  reindexResultSchema,
  TAG_MAX_LENGTH,
  updateDocumentSchema,
} from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { buildDocumentSummary, issuePaths } from '../fixtures.js'

const tags = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `tag-${index}`)

describe('createDocumentSchema', () => {
  it.each([
    [
      'defaults tags to an empty list',
      { title: 'Guide', content: 'Body' },
      { title: 'Guide', content: 'Body', tags: [] },
    ],
    [
      'trims the title and each tag',
      { title: '  Guide  ', content: 'Body', tags: ['  ops  '] },
      { title: 'Guide', content: 'Body', tags: ['ops'] },
    ],
    [
      'removes duplicate tags',
      { title: 'Guide', content: 'Body', tags: ['ops', 'ops ', 'infra'] },
      { title: 'Guide', content: 'Body', tags: ['ops', 'infra'] },
    ],
    [
      'keeps content verbatim',
      { title: 'Guide', content: '    indented code\n' },
      { title: 'Guide', content: '    indented code\n', tags: [] },
    ],
    [
      'accepts values at every limit',
      {
        title: 't'.repeat(DOCUMENT_TITLE_MAX),
        content: 'c'.repeat(DOCUMENT_CONTENT_MAX),
        tags: tags(MAX_TAGS),
      },
      {
        title: 't'.repeat(DOCUMENT_TITLE_MAX),
        content: 'c'.repeat(DOCUMENT_CONTENT_MAX),
        tags: tags(MAX_TAGS),
      },
    ],
  ])('%s', (_, input, expected) => {
    expect(createDocumentSchema.parse(input)).toEqual(expected)
  })

  it.each([
    ['a missing title', { content: 'Body' }, 'title'],
    ['a blank title', { title: '   ', content: 'Body' }, 'title'],
    ['an overlong title', { title: 't'.repeat(DOCUMENT_TITLE_MAX + 1), content: 'Body' }, 'title'],
    ['empty content', { title: 'Guide', content: '' }, 'content'],
    [
      'overlong content',
      { title: 'Guide', content: 'c'.repeat(DOCUMENT_CONTENT_MAX + 1) },
      'content',
    ],
    ['a blank tag', { title: 'Guide', content: 'Body', tags: ['ok', ' '] }, 'tags.1'],
    [
      'an overlong tag',
      { title: 'Guide', content: 'Body', tags: ['t'.repeat(TAG_MAX_LENGTH + 1)] },
      'tags.0',
    ],
    ['too many tags', { title: 'Guide', content: 'Body', tags: tags(MAX_TAGS + 1) }, 'tags'],
    ['a non-string tag', { title: 'Guide', content: 'Body', tags: [42] }, 'tags.0'],
    ['a NUL in the title', { title: 'Gu\u0000ide', content: 'Body' }, 'title'],
    ['a NUL in the content', { title: 'Guide', content: 'Bo\u0000dy' }, 'content'],
    ['a NUL in a tag', { title: 'Guide', content: 'Body', tags: ['o\u0000ps'] }, 'tags.0'],
  ])('rejects %s', (_, input, path) => {
    expect(issuePaths(createDocumentSchema, input)).toContain(path)
  })
})

describe('updateDocumentSchema', () => {
  it('leaves omitted fields undefined instead of applying create defaults', () => {
    expect(updateDocumentSchema.parse({ title: 'Renamed' })).toEqual({ title: 'Renamed' })
  })

  it.each([
    ['a tags-only change', { tags: ['ops'] }],
    ['clearing all tags', { tags: [] }],
    ['a content-only change', { content: 'New body' }],
  ])('accepts %s', (_, input) => {
    expect(updateDocumentSchema.safeParse(input).success).toBe(true)
  })

  it.each([
    ['an empty patch', {}, ''],
    ['a patch with only unknown keys', { embeddingStatus: 'ready' }, ''],
    ['a blank title', { title: ' ' }, 'title'],
    ['empty content', { content: '' }, 'content'],
    ['a NUL in the content', { content: 'New\u0000body' }, 'content'],
  ])('rejects %s', (_, input, path) => {
    expect(issuePaths(updateDocumentSchema, input)).toContain(path)
  })
})

describe('listDocumentsQuerySchema', () => {
  it('applies pagination defaults', () => {
    expect(listDocumentsQuerySchema.parse({})).toEqual({ limit: PAGE_SIZE_DEFAULT, offset: 0 })
  })

  it('coerces query-string numbers and trims the search term', () => {
    expect(
      listDocumentsQuerySchema.parse({
        limit: '10',
        offset: '20',
        search: ' rag ',
        status: 'ready',
      })
    ).toEqual({ limit: 10, offset: 20, search: 'rag', status: 'ready' })
  })

  it.each([
    ['a zero limit', { limit: '0' }, 'limit'],
    ['a limit above the maximum', { limit: String(PAGE_SIZE_MAX + 1) }, 'limit'],
    ['a non-numeric limit', { limit: 'ten' }, 'limit'],
    ['a fractional limit', { limit: '2.5' }, 'limit'],
    ['a negative offset', { offset: '-1' }, 'offset'],
    ['a blank search term', { search: '  ' }, 'search'],
    ['a NUL in the search term', { search: 'ra\u0000g' }, 'search'],
    ['an unknown status', { status: 'done' }, 'status'],
    ['a NUL in the tag filter', { tag: 'o\u0000ps' }, 'tag'],
  ])('rejects %s', (_, input, path) => {
    expect(issuePaths(listDocumentsQuerySchema, input)).toContain(path)
  })
})

describe('documentSummarySchema', () => {
  it.each([
    ['a ready document', buildDocumentSummary()],
    [
      'a document that has never been embedded',
      buildDocumentSummary({ embeddingStatus: 'pending', embeddingModel: null, chunkCount: 0 }),
    ],
    [
      'a terminal failure without a scheduled retry',
      buildDocumentSummary({
        embeddingStatus: 'failed',
        embeddingError: 'Invalid API key',
        nextAttemptAt: null,
      }),
    ],
    [
      'an uploaded file',
      buildDocumentSummary({ sourceType: 'upload', sourceFilename: 'handbook.pdf' }),
    ],
  ])('accepts %s', (_, input) => {
    expect(documentSummarySchema.safeParse(input).success).toBe(true)
  })

  it.each([
    ['a non-uuid id', { id: 'doc-1' }, 'id'],
    ['an unknown embedding status', { embeddingStatus: 'queued' }, 'embeddingStatus'],
    ['an unknown source type', { sourceType: 'import' }, 'sourceType'],
    ['a negative chunk count', { chunkCount: -1 }, 'chunkCount'],
    ['a non-ISO timestamp', { createdAt: '29/09/2026' }, 'createdAt'],
  ])('rejects %s', (_, overrides, path) => {
    expect(
      issuePaths(documentSummarySchema, { ...buildDocumentSummary(), ...overrides })
    ).toContain(path)
  })

  it('requires the full content on the detail schema', () => {
    expect(issuePaths(documentSchema, buildDocumentSummary())).toContain('content')
    expect(documentSchema.safeParse({ ...buildDocumentSummary(), content: '# Body' }).success).toBe(
      true
    )
  })
})

describe('documentListSchema', () => {
  it('accepts a page of summaries', () => {
    const page = { items: [buildDocumentSummary()], total: 1, limit: 50, offset: 0 }
    expect(documentListSchema.safeParse(page).success).toBe(true)
  })

  it('rejects a negative total', () => {
    expect(
      issuePaths(documentListSchema, { items: [], total: -1, limit: 50, offset: 0 })
    ).toContain('total')
  })
})

describe('reindexResultSchema', () => {
  it.each([
    [0, true],
    [12, true],
    [-1, false],
    [1.5, false],
  ])('queued=%s parses: %s', (queued, expected) => {
    expect(reindexResultSchema.safeParse({ queued }).success).toBe(expected)
  })
})
