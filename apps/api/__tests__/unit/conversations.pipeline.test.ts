import {
  apiErrorSchema,
  conversationDetailSchema,
  conversationListSchema,
  conversationSchema,
} from '@kb/contracts'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { DatabaseClient } from '../../src/database/database-client.types.js'
import { ConversationsRepository } from '../../src/modules/chat/conversations.repository.js'
import { toQuestionInsert } from '../../src/modules/chat/messages.mapper.js'
import { MessagesRepository } from '../../src/modules/chat/messages.repository.js'
import { inMemoryChat } from '../fakes/in-memory-chat.repositories.js'
import { TestApp } from '../fakes/test-app.js'
import { TEST_CONVERSATION_ID } from '../fixtures/chat.js'

// The in-memory repositories ignore the client; RLS is covered by the repository tests.
const NO_DB = {} as DatabaseClient
const store = inMemoryChat()
let api: TestApp

beforeAll(async () => {
  api = await TestApp.start((builder) =>
    builder
      .overrideProvider(ConversationsRepository)
      .useValue(store.conversations)
      .overrideProvider(MessagesRepository)
      .useValue(store.messages)
  )
})

afterAll(async () => {
  await api.close()
})

function create(headers: Record<string, string>, body?: object) {
  const init: RequestInit =
    body === undefined
      ? { method: 'POST', headers }
      : {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
  return api.call('/conversations', init)
}

describe('conversations over HTTP', () => {
  it('creates a conversation with 201, with or without a title or a body', async () => {
    const headers = api.signIn()

    const titled = await create(headers, { title: '  Pricing  ' })
    const untitled = await create(headers, {})
    const bodyless = await create(headers)

    expect([titled, untitled, bodyless].map(({ response }) => response.status)).toEqual([
      201, 201, 201,
    ])
    expect(conversationSchema.parse(titled.body).title).toBe('Pricing')
    expect(conversationSchema.parse(untitled.body).title).toBeNull()
    expect(conversationSchema.parse(bodyless.body).title).toBeNull()
  })

  it('rejects an invalid title with 422 and a field error', async () => {
    const { response, body } = await create(api.signIn(), { title: 'x'.repeat(121) })

    expect(response.status).toBe(422)
    expect(apiErrorSchema.parse(body).errors).toHaveProperty('title')
  })

  it('lists conversations by latest activity: a new message moves one to the top', async () => {
    const headers = api.signIn()
    const first = conversationSchema.parse((await create(headers, { title: 'First' })).body)
    await create(headers, { title: 'Second' })
    await store.messages.insert(NO_DB, toQuestionInsert(first.id, 'A late question'))

    const { response, body } = await api.call('/conversations?limit=2&offset=0', { headers })

    expect(response.status).toBe(200)
    const list = conversationListSchema.parse(body)
    expect(list).toMatchObject({ limit: 2, offset: 0 })
    expect(list.items[0]?.id).toBe(first.id)
    expect(Date.parse(list.items[0]?.updatedAt ?? '')).toBeGreaterThan(Date.parse(first.updatedAt))
  })

  it('reads a conversation with its messages, renames it and deletes it with them', async () => {
    const headers = api.signIn()
    const { id } = conversationSchema.parse((await create(headers, {})).body)
    await store.messages.insert(NO_DB, toQuestionInsert(id, 'Hello'))
    const item = `/conversations/${id}`

    const read = await api.call(item, { headers })
    const renamed = await api.call(item, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Renamed' }),
    })
    const deleted = await api.call(item, { method: 'DELETE', headers })
    const gone = await api.call(item, { headers })

    expect(read.response.status).toBe(200)
    expect(
      conversationDetailSchema.parse(read.body).messages.map(({ content }) => content)
    ).toEqual(['Hello'])
    expect(renamed.response.status).toBe(200)
    expect(conversationSchema.parse(renamed.body).title).toBe('Renamed')
    expect(deleted.response.status).toBe(204)
    expect(deleted.text).toBe('')
    expect(gone.response.status).toBe(404)
    expect(store.tables.messages.some((message) => message.conversationId === id)).toBe(false)
  })

  it('answers 404 in the shared shape for a conversation the caller cannot see', async () => {
    const headers = api.signIn()
    const item = `/conversations/${TEST_CONVERSATION_ID}`

    const read = await api.call(item, { headers })
    const renamed = await api.call(item, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' }),
    })
    const deleted = await api.call(item, { method: 'DELETE', headers })

    for (const { response, body } of [read, renamed, deleted]) {
      expect(response.status).toBe(404)
      expect(body).toEqual({ code: 'not_found', messages: ['Conversation not found'] })
    }
  })

  it('answers 422 for an id that is not a UUID and 401 without a token', async () => {
    const malformed = await api.call('/conversations/not-a-uuid', { headers: api.signIn() })
    const anonymous = await api.call('/conversations')

    expect(malformed.response.status).toBe(422)
    expect(apiErrorSchema.parse(malformed.body).errors).toHaveProperty('id')
    expect(anonymous.response.status).toBe(401)
  })
})
