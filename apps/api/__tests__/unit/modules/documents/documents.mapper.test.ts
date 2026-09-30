import { documentSchema, documentSummarySchema } from '@kb/contracts'
import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { CONTENT_PREVIEW_LENGTH } from '../../../../src/modules/documents/documents.constants.js'
import {
  toDocument,
  toDocumentInsert,
  toDocumentSummary,
  toDocumentUpdate,
} from '../../../../src/modules/documents/documents.mapper.js'
import {
  API_TIMESTAMP,
  buildDocumentRow,
  buildDocumentSummaryRow,
  TEST_DOCUMENT_ID,
} from '../../../fixtures/documents.js'

const GLOBE = '🌍'

describe('toDocumentSummary', () => {
  it('maps a document_summaries row onto the summary contract', () => {
    const summary = toDocumentSummary(
      buildDocumentSummaryRow({
        embedding_status: 'failed',
        embedding_error: 'rate limited',
        embedding_model: 'text-embedding-3-small',
        chunk_count: 3,
        ingestion_attempts: 2,
        source_type: 'upload',
        source_filename: 'notes.md',
      })
    )

    expect(documentSummarySchema.parse(summary)).toEqual(summary)
    expect(summary).toEqual({
      id: TEST_DOCUMENT_ID,
      title: 'Release notes',
      contentPreview: '# Release notes\n\nShipped uploads.',
      contentLength: 33,
      tags: ['release'],
      sourceType: 'upload',
      sourceFilename: 'notes.md',
      embeddingStatus: 'failed',
      embeddingError: 'rate limited',
      embeddingModel: 'text-embedding-3-small',
      chunkCount: 3,
      ingestionAttempts: 2,
      nextAttemptAt: API_TIMESTAMP,
      createdAt: API_TIMESTAMP,
      updatedAt: API_TIMESTAMP,
    })
  })

  it('keeps the view columns that are nullable in the table as null', () => {
    const summary = toDocumentSummary(buildDocumentSummaryRow())

    expect(summary).toMatchObject({
      sourceFilename: null,
      embeddingError: null,
      embeddingModel: null,
    })
  })

  it.each(['id', 'title', 'content_length', 'embedding_status', 'created_at'] as const)(
    'rejects a view row whose NOT NULL column %s came back null',
    (column) => {
      expect(() => toDocumentSummary(buildDocumentSummaryRow({ [column]: null }))).toThrow(ZodError)
    }
  )

  it('reports no scheduled retry while next_attempt_at is infinity', () => {
    const summary = toDocumentSummary(buildDocumentSummaryRow({ next_attempt_at: 'infinity' }))

    expect(summary.nextAttemptAt).toBeNull()
  })

  it('normalises Postgres timestamps to UTC ISO strings', () => {
    const summary = toDocumentSummary(
      buildDocumentSummaryRow({ updated_at: '2026-09-30T01:15:00.5+02:00' })
    )

    expect(summary.updatedAt).toBe('2026-09-29T23:15:00.500Z')
  })

  it('rejects values outside the contract enums', () => {
    expect(() => toDocumentSummary(buildDocumentSummaryRow({ source_type: 'import' }))).toThrow(
      ZodError
    )
  })
})

describe('toDocument', () => {
  it('maps a documents row onto the document contract', () => {
    const document = toDocument(buildDocumentRow())

    expect(documentSchema.parse(document)).toEqual(document)
    expect(document.content).toBe('# Release notes\n\nShipped uploads.')
  })

  it('computes the preview fields in code points, like the summaries view', () => {
    const content = `${GLOBE.repeat(CONTENT_PREVIEW_LENGTH)}tail`
    const document = toDocument(buildDocumentRow({ content }))

    expect(document.contentLength).toBe(CONTENT_PREVIEW_LENGTH + 4)
    expect(document.contentPreview).toBe(GLOBE.repeat(CONTENT_PREVIEW_LENGTH))
  })
})

describe('toDocumentInsert', () => {
  const input = { title: 'Notes', content: 'Body', tags: ['a'] }

  it('writes only the columns users may insert', () => {
    expect(toDocumentInsert(input, { type: 'editor' })).toEqual({
      title: 'Notes',
      content: 'Body',
      tags: ['a'],
      source_type: 'editor',
      source_filename: null,
    })
  })

  it('records where an upload came from', () => {
    expect(toDocumentInsert(input, { type: 'upload', filename: 'notes.md' })).toMatchObject({
      source_type: 'upload',
      source_filename: 'notes.md',
    })
  })
})

describe('toDocumentUpdate', () => {
  it('writes only the fields the patch names', () => {
    expect(toDocumentUpdate({ tags: ['b'] })).toEqual({ tags: ['b'] })
    expect(toDocumentUpdate({ title: 'New', content: 'Text' })).toEqual({
      title: 'New',
      content: 'Text',
    })
  })
})
