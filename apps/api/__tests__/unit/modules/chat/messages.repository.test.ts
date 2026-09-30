import { describe, expect, it } from 'vitest'

import { DatabaseRequestError } from '../../../../src/database/database-error.js'
import { MESSAGE_COLUMNS } from '../../../../src/modules/chat/chat.constants.js'
import { toQuestionInsert } from '../../../../src/modules/chat/messages.mapper.js'
import { MessagesRepository } from '../../../../src/modules/chat/messages.repository.js'
import { fakeDatabase } from '../../../fakes/fake-database.js'
import { buildMessageRow, TEST_CONVERSATION_ID } from '../../../fixtures/chat.js'

const repository = new MessagesRepository()
const FIRST = buildMessageRow({ id: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e' })
const SECOND = buildMessageRow({ id: '9f8e7d6c-5b4a-4c3d-9e2f-1a0b9c8d7e6f', role: 'assistant' })

describe('MessagesRepository', () => {
  it('lists a whole conversation oldest first', async () => {
    const { db, queries } = fakeDatabase({ data: [FIRST, SECOND] })

    const messages = await repository.listByConversation(db, TEST_CONVERSATION_ID)

    expect(messages.map(({ id }) => id)).toEqual([FIRST.id, SECOND.id])
    expect(queries[0]).toEqual([
      { method: 'from', args: ['messages'] },
      { method: 'select', args: [MESSAGE_COLUMNS] },
      { method: 'eq', args: ['conversation_id', TEST_CONVERSATION_ID] },
      { method: 'order', args: ['created_at', { ascending: true }] },
      { method: 'order', args: ['id', { ascending: true }] },
    ])
  })

  it('reads the latest messages newest first and hands them back oldest first', async () => {
    const { db, queries } = fakeDatabase({ data: [SECOND, FIRST] })

    const messages = await repository.listRecent(db, TEST_CONVERSATION_ID, 20)

    expect(messages.map(({ id }) => id)).toEqual([FIRST.id, SECOND.id])
    expect(queries[0]?.slice(3)).toEqual([
      { method: 'order', args: ['created_at', { ascending: false }] },
      { method: 'order', args: ['id', { ascending: false }] },
      { method: 'limit', args: [20] },
    ])
  })

  it('inserts a row and returns the stored message', async () => {
    const { db, queries } = fakeDatabase({ data: FIRST })
    const row = toQuestionInsert(TEST_CONVERSATION_ID, 'What does the Pro plan cost?')

    const message = await repository.insert(db, row)

    expect(message.id).toBe(FIRST.id)
    expect(queries[0]).toEqual([
      { method: 'from', args: ['messages'] },
      { method: 'insert', args: [row] },
      { method: 'select', args: [MESSAGE_COLUMNS] },
      { method: 'single', args: [] },
    ])
  })

  it('throws failures with their HTTP status', async () => {
    const violation = { code: '42501', message: 'new row violates row-level security policy' }
    const { db } = fakeDatabase({ error: violation, status: 403 })

    const rejection = repository.insert(db, toQuestionInsert(TEST_CONVERSATION_ID, 'Hi'))

    await expect(rejection).rejects.toBeInstanceOf(DatabaseRequestError)
    await expect(rejection).rejects.toMatchObject({ status: 403, code: '42501' })
  })
})
