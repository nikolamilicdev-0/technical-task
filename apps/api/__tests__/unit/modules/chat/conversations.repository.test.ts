import { describe, expect, it } from 'vitest'

import { DatabaseRequestError } from '../../../../src/database/database-error.js'
import { CONVERSATION_COLUMNS } from '../../../../src/modules/chat/chat.constants.js'
import { ConversationsRepository } from '../../../../src/modules/chat/conversations.repository.js'
import { fakeDatabase } from '../../../fakes/fake-database.js'
import { buildConversationRow, TEST_CONVERSATION_ID } from '../../../fixtures/chat.js'
import { API_TIMESTAMP } from '../../../fixtures/documents.js'

const repository = new ConversationsRepository()
const CONVERSATION = {
  id: TEST_CONVERSATION_ID,
  title: 'Pricing questions',
  createdAt: API_TIMESTAMP,
  updatedAt: API_TIMESTAMP,
}
const RANGE_NOT_SATISFIABLE = {
  code: 'PGRST103',
  message: 'Requested range not satisfiable',
  details: '',
  hint: '',
}

describe('ConversationsRepository', () => {
  it('lists the most recently active conversations first, one counted page at a time', async () => {
    const { db, queries } = fakeDatabase({ data: [buildConversationRow()], count: 7 })

    const page = await repository.list(db, { limit: 5, offset: 5 })

    expect(queries).toEqual([
      [
        { method: 'from', args: ['conversations'] },
        { method: 'select', args: [CONVERSATION_COLUMNS, { count: 'exact' }] },
        { method: 'order', args: ['updated_at', { ascending: false }] },
        { method: 'order', args: ['id', { ascending: true }] },
        { method: 'range', args: [5, 9] },
      ],
    ])
    expect(page).toEqual({ items: [CONVERSATION], total: 7 })
  })

  it('answers an offset past the last row with an empty page and the real total', async () => {
    const { db, queries } = fakeDatabase(
      { error: RANGE_NOT_SATISFIABLE, status: 416 },
      { count: 2 }
    )

    const page = await repository.list(db, { limit: 5, offset: 50 })

    expect(page).toEqual({ items: [], total: 2 })
    expect(queries[1]).toEqual([
      { method: 'from', args: ['conversations'] },
      { method: 'select', args: ['id', { count: 'exact', head: true }] },
    ])
  })

  it('reads one conversation, null when RLS hides it', async () => {
    const found = fakeDatabase({ data: buildConversationRow({ title: null }) })
    const hidden = fakeDatabase({ data: null })

    await expect(repository.findById(found.db, TEST_CONVERSATION_ID)).resolves.toEqual({
      ...CONVERSATION,
      title: null,
    })
    await expect(repository.findById(hidden.db, TEST_CONVERSATION_ID)).resolves.toBeNull()
    expect(found.queries[0]).toEqual([
      { method: 'from', args: ['conversations'] },
      { method: 'select', args: [CONVERSATION_COLUMNS] },
      { method: 'eq', args: ['id', TEST_CONVERSATION_ID] },
      { method: 'maybeSingle', args: [] },
    ])
  })

  it('inserts an untitled conversation when no title is given', async () => {
    const { db, queries } = fakeDatabase({ data: buildConversationRow({ title: null }) })

    await repository.insert(db, {})

    expect(queries[0]?.[1]).toEqual({ method: 'insert', args: [{ title: null }] })
  })

  it('renames one conversation, null when there is none to rename', async () => {
    const renamed = fakeDatabase({ data: buildConversationRow({ title: 'Renamed' }) })
    const missing = fakeDatabase({ data: null })

    await expect(
      repository.update(renamed.db, TEST_CONVERSATION_ID, { title: 'Renamed' })
    ).resolves.toMatchObject({ title: 'Renamed' })
    await expect(
      repository.update(missing.db, TEST_CONVERSATION_ID, { title: 'x' })
    ).resolves.toBeNull()
    expect(renamed.queries[0]?.slice(1, 3)).toEqual([
      { method: 'update', args: [{ title: 'Renamed' }] },
      { method: 'eq', args: ['id', TEST_CONVERSATION_ID] },
    ])
  })

  it('names a conversation only while it is untitled', async () => {
    const { db, queries } = fakeDatabase({ data: null })

    await expect(
      repository.setTitleIfUntitled(db, TEST_CONVERSATION_ID, 'Pricing')
    ).resolves.toBeNull()

    expect(queries[0]).toEqual([
      { method: 'from', args: ['conversations'] },
      { method: 'update', args: [{ title: 'Pricing' }] },
      { method: 'eq', args: ['id', TEST_CONVERSATION_ID] },
      { method: 'is', args: ['title', null] },
      { method: 'select', args: [CONVERSATION_COLUMNS] },
      { method: 'maybeSingle', args: [] },
    ])
  })

  it('reports whether a visible conversation was deleted', async () => {
    const deleted = fakeDatabase({ data: [{ id: TEST_CONVERSATION_ID }] })
    const missing = fakeDatabase({ data: [] })

    await expect(repository.delete(deleted.db, TEST_CONVERSATION_ID)).resolves.toBe(true)
    await expect(repository.delete(missing.db, TEST_CONVERSATION_ID)).resolves.toBe(false)
  })

  it('throws failures with their HTTP status', async () => {
    const { db } = fakeDatabase({ error: { code: '', message: 'fetch failed' }, status: 0 })

    const rejection = repository.findById(db, TEST_CONVERSATION_ID)

    await expect(rejection).rejects.toBeInstanceOf(DatabaseRequestError)
    await expect(rejection).rejects.toMatchObject({ status: 0, transient: true })
  })
})
