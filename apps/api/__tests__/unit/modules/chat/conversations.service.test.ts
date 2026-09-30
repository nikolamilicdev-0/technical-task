import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import type { UserContext } from '../../../../src/database/user-context.types.js'
import { ConversationsRepository } from '../../../../src/modules/chat/conversations.repository.js'
import { ConversationsService } from '../../../../src/modules/chat/conversations.service.js'
import { toQuestionInsert } from '../../../../src/modules/chat/messages.mapper.js'
import { MessagesRepository } from '../../../../src/modules/chat/messages.repository.js'
import { inMemoryChat } from '../../../fakes/in-memory-chat.repositories.js'
import { TEST_USER } from '../../../fixtures.js'
import { TEST_CONVERSATION_ID } from '../../../fixtures/chat.js'

const USER: UserContext = { userId: TEST_USER.id, db: {} as DatabaseClient }
const NOT_FOUND = { code: 'not_found', messages: ['Conversation not found'] }

let service: ConversationsService
let store: ReturnType<typeof inMemoryChat>

beforeEach(async () => {
  store = inMemoryChat()
  const moduleRef = await Test.createTestingModule({
    providers: [
      ConversationsService,
      { provide: ConversationsRepository, useValue: store.conversations },
      { provide: MessagesRepository, useValue: store.messages },
    ],
  }).compile()
  service = moduleRef.get(ConversationsService)
})

async function rejectionOf(promise: Promise<unknown>): Promise<ApiHttpException> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason
  )
  if (error instanceof ApiHttpException) return error
  throw new Error(`Expected an ApiHttpException, got ${String(error)}`)
}

describe('ConversationsService', () => {
  it('lists the most recently active conversations first and echoes the window', async () => {
    const older = await service.create(USER, { title: 'Older' })
    const newer = await service.create(USER, {})
    await store.messages.insert(USER.db, toQuestionInsert(older.id, 'A new question'))

    const list = await service.list(USER, { limit: 10, offset: 0 })

    expect(list).toMatchObject({ total: 2, limit: 10, offset: 0 })
    expect(list.items.map(({ id }) => id)).toEqual([older.id, newer.id])
  })

  it('returns a conversation with its messages, oldest first', async () => {
    const conversation = await service.create(USER, { title: 'Pricing' })
    await store.messages.insert(USER.db, toQuestionInsert(conversation.id, 'First'))
    await store.messages.insert(USER.db, toQuestionInsert(conversation.id, 'Second'))

    const detail = await service.get(USER, conversation.id)

    expect(detail.conversation).toMatchObject({ id: conversation.id, title: 'Pricing' })
    expect(detail.messages.map(({ content }) => content)).toEqual(['First', 'Second'])
  })

  it('renames a conversation', async () => {
    const { id } = await service.create(USER, {})

    await expect(service.update(USER, id, { title: 'Renamed' })).resolves.toMatchObject({
      id,
      title: 'Renamed',
    })
  })

  it('deletes a conversation together with its messages', async () => {
    const { id } = await service.create(USER, {})
    await store.messages.insert(USER.db, toQuestionInsert(id, 'Gone soon'))

    await service.remove(USER, id)

    expect(store.tables.messages).toEqual([])
    expect((await rejectionOf(service.get(USER, id))).body).toEqual(NOT_FOUND)
  })

  it.each([
    ['reading', () => service.get(USER, TEST_CONVERSATION_ID)],
    ['renaming', () => service.update(USER, TEST_CONVERSATION_ID, { title: 'x' })],
    ['deleting', () => service.remove(USER, TEST_CONVERSATION_ID)],
  ])('answers 404 when %s a conversation the caller cannot see', async (_, act) => {
    const error = await rejectionOf(act())

    expect(error.getStatus()).toBe(404)
    expect(error.body).toEqual(NOT_FOUND)
  })
})
