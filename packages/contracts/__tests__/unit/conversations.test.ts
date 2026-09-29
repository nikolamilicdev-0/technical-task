import {
  CONVERSATION_TITLE_MAX,
  conversationDetailSchema,
  conversationListSchema,
  conversationSchema,
  createConversationSchema,
  listConversationsQuerySchema,
  PAGE_SIZE_DEFAULT,
  updateConversationSchema,
} from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { buildConversation, buildMessage, issuePaths } from '../fixtures.js'

describe('conversationSchema', () => {
  it.each([
    ['a titled conversation', buildConversation()],
    ['a conversation created before its first message', buildConversation({ title: null })],
  ])('accepts %s', (_, input) => {
    expect(conversationSchema.safeParse(input).success).toBe(true)
  })

  it('rejects a missing title key (null is explicit)', () => {
    const { title: _title, ...untitled } = buildConversation()
    expect(issuePaths(conversationSchema, untitled)).toContain('title')
  })
})

describe('createConversationSchema', () => {
  it.each([
    ['no title', {}, {}],
    ['a trimmed title', { title: '  Planning  ' }, { title: 'Planning' }],
  ])('accepts %s', (_, input, expected) => {
    expect(createConversationSchema.parse(input)).toEqual(expected)
  })

  it.each([
    ['a blank title', { title: '   ' }],
    ['an overlong title', { title: 't'.repeat(CONVERSATION_TITLE_MAX + 1) }],
  ])('rejects %s', (_, input) => {
    expect(issuePaths(createConversationSchema, input)).toContain('title')
  })
})

describe('updateConversationSchema', () => {
  it('requires a title', () => {
    expect(issuePaths(updateConversationSchema, {})).toContain('title')
    expect(updateConversationSchema.parse({ title: 'Renamed' })).toEqual({ title: 'Renamed' })
  })
})

describe('conversation collections', () => {
  it('paginates with the shared defaults', () => {
    expect(listConversationsQuerySchema.parse({})).toEqual({ limit: PAGE_SIZE_DEFAULT, offset: 0 })
  })

  it('accepts a page of conversations', () => {
    const page = { items: [buildConversation()], total: 1, limit: 50, offset: 0 }
    expect(conversationListSchema.safeParse(page).success).toBe(true)
  })

  it('accepts a conversation with its messages', () => {
    const detail = { conversation: buildConversation(), messages: [buildMessage()] }
    expect(conversationDetailSchema.safeParse(detail).success).toBe(true)
  })

  it('rejects a detail whose messages are invalid', () => {
    const detail = {
      conversation: buildConversation(),
      messages: [{ ...buildMessage(), role: 'bot' }],
    }
    expect(issuePaths(conversationDetailSchema, detail)).toContain('messages.0.role')
  })
})
