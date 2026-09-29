import { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import {
  DOCUMENT_COLUMNS,
  DOCUMENT_SUMMARY_COLUMNS,
} from '../../../../src/modules/documents/documents.constants.js'
import { DocumentsRepository } from '../../../../src/modules/documents/documents.repository.js'
import { fakeDatabase } from '../../../fakes/fake-database.js'
import {
  buildDocumentRow,
  buildDocumentSummaryRow,
  TEST_DOCUMENT_ID,
} from '../../../fixtures/documents.js'

const repository = new DocumentsRepository()
const PAGE = { limit: 10, offset: 20 }
const RANGE_NOT_SATISFIABLE = {
  code: 'PGRST103',
  message: 'Requested range not satisfiable',
  details: 'An offset of 20 was requested, but there are only 3 rows.',
  hint: null,
}

describe('DocumentsRepository', () => {
  describe('list', () => {
    it('reads the summaries view newest first, one counted page at a time', async () => {
      const { db, queries } = fakeDatabase({ data: [buildDocumentSummaryRow()], count: 21 })

      const page = await repository.list(db, PAGE)

      expect(queries).toEqual([
        [
          { method: 'from', args: ['document_summaries'] },
          { method: 'select', args: [DOCUMENT_SUMMARY_COLUMNS, { count: 'exact', head: false }] },
          { method: 'order', args: ['updated_at', { ascending: false }] },
          { method: 'order', args: ['id', { ascending: true }] },
          { method: 'range', args: [20, 29] },
        ],
      ])
      expect(page.total).toBe(21)
      expect(page.items.map(({ id }) => id)).toEqual([TEST_DOCUMENT_ID])
    })

    it('applies the search, tag and status filters with escaped values', async () => {
      const { db, queries } = fakeDatabase({ data: [], count: 0 })

      await repository.list(db, { ...PAGE, search: '50% off', tag: 'a,b', status: 'ready' })

      expect(queries[0]).toEqual(
        expect.arrayContaining([
          { method: 'ilike', args: ['title', '%50\\% off%'] },
          { method: 'contains', args: ['tags', '{"a,b"}'] },
          { method: 'eq', args: ['embedding_status', 'ready'] },
        ])
      )
    })

    it('answers an offset past the last match with an empty page and the real total', async () => {
      const { db, queries } = fakeDatabase({ error: RANGE_NOT_SATISFIABLE }, { count: 3 })

      const page = await repository.list(db, { ...PAGE, tag: 'q3' })

      expect(page).toEqual({ items: [], total: 3 })
      expect(queries[1]).toEqual([
        { method: 'from', args: ['document_summaries'] },
        { method: 'select', args: [DOCUMENT_SUMMARY_COLUMNS, { count: 'exact', head: true }] },
        { method: 'contains', args: ['tags', '{"q3"}'] },
      ])
    })

    it('throws database failures as PostgrestError instances', async () => {
      const failure = { code: '57014', message: 'canceling statement', details: '', hint: '' }
      const { db } = fakeDatabase({ error: failure })

      const rejection = repository.list(db, PAGE)

      await expect(rejection).rejects.toBeInstanceOf(PostgrestError)
      await expect(rejection).rejects.toMatchObject({ code: '57014' })
    })
  })

  describe('findById', () => {
    it('reads one document with its content', async () => {
      const { db, queries } = fakeDatabase({ data: buildDocumentRow() })

      const document = await repository.findById(db, TEST_DOCUMENT_ID)

      expect(document?.content).toBe(buildDocumentRow().content)
      expect(queries[0]).toEqual([
        { method: 'from', args: ['documents'] },
        { method: 'select', args: [DOCUMENT_COLUMNS] },
        { method: 'eq', args: ['id', TEST_DOCUMENT_ID] },
        { method: 'maybeSingle', args: [] },
      ])
    })

    it('returns null when RLS hides the row or it does not exist', async () => {
      const { db } = fakeDatabase({ data: null })

      await expect(repository.findById(db, TEST_DOCUMENT_ID)).resolves.toBeNull()
    })
  })

  it('inserts only user-writable columns and returns the stored document', async () => {
    const { db, queries } = fakeDatabase({ data: buildDocumentRow({ source_type: 'upload' }) })

    const document = await repository.insert(
      db,
      { title: 'Notes', content: 'Body', tags: [] },
      { type: 'upload', filename: 'notes.md' }
    )

    expect(document.sourceType).toBe('upload')
    expect(queries[0]).toEqual([
      { method: 'from', args: ['documents'] },
      {
        method: 'insert',
        args: [
          {
            title: 'Notes',
            content: 'Body',
            tags: [],
            source_type: 'upload',
            source_filename: 'notes.md',
          },
        ],
      },
      { method: 'select', args: [DOCUMENT_COLUMNS] },
      { method: 'single', args: [] },
    ])
  })

  describe('update', () => {
    it('writes only the named fields of one document', async () => {
      const { db, queries } = fakeDatabase({ data: buildDocumentRow({ tags: ['b'] }) })

      const document = await repository.update(db, TEST_DOCUMENT_ID, { tags: ['b'] })

      expect(document?.tags).toEqual(['b'])
      expect(queries[0]).toEqual([
        { method: 'from', args: ['documents'] },
        { method: 'update', args: [{ tags: ['b'] }] },
        { method: 'eq', args: ['id', TEST_DOCUMENT_ID] },
        { method: 'select', args: [DOCUMENT_COLUMNS] },
        { method: 'maybeSingle', args: [] },
      ])
    })

    it('returns null when no visible row was updated', async () => {
      const { db } = fakeDatabase({ data: null })

      await expect(repository.update(db, TEST_DOCUMENT_ID, { title: 'x' })).resolves.toBeNull()
    })
  })

  describe('delete', () => {
    it('reports whether a visible row was deleted', async () => {
      const deleted = fakeDatabase({ data: [{ id: TEST_DOCUMENT_ID }] })
      const missing = fakeDatabase({ data: [] })

      await expect(repository.delete(deleted.db, TEST_DOCUMENT_ID)).resolves.toBe(true)
      await expect(repository.delete(missing.db, TEST_DOCUMENT_ID)).resolves.toBe(false)
      expect(deleted.queries[0]).toEqual([
        { method: 'from', args: ['documents'] },
        { method: 'delete', args: [] },
        { method: 'eq', args: ['id', TEST_DOCUMENT_ID] },
        { method: 'select', args: ['id'] },
      ])
    })
  })
})
