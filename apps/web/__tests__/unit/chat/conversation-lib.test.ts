// @vitest-environment node
import { CONVERSATION_TITLE_DERIVED_MAX } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import {
  buildConversation,
  buildConversationList,
  CONVERSATION_ID,
  OTHER_CONVERSATION_ID,
} from '@/__tests__/fixtures/chat'
import {
  prependConversation,
  removeConversation,
  replaceConversation,
} from '@/features/chat/lib/conversation-cache'
import { getConversationIdFromPath } from '@/features/chat/lib/conversation-path'
import { conversationsKeys } from '@/features/chat/lib/conversations-keys'
import { newConversationInput } from '@/features/chat/lib/derive-title'

describe('getConversationIdFromPath', () => {
  it('reads the conversation of a /chat/<id> path', () => {
    expect(getConversationIdFromPath(`/chat/${CONVERSATION_ID}`)).toBe(CONVERSATION_ID)
  })

  it.each([
    null,
    '/chat',
    '/chat/',
    '/chat/not-a-uuid',
    `/chat/${CONVERSATION_ID}/extra`,
    `/documents/${CONVERSATION_ID}`,
  ])('is null for %s', (pathname) => {
    expect(getConversationIdFromPath(pathname)).toBeNull()
  })
})

describe('newConversationInput', () => {
  it('titles the conversation after the first line of its first question', () => {
    expect(newConversationInput('How do I set up?\nDetails follow.')).toEqual({
      title: 'How do I set up?',
    })
  })

  it('cuts long questions at a word boundary', () => {
    const { title = '' } = newConversationInput('word '.repeat(40))
    expect(title.length).toBeLessThanOrEqual(CONVERSATION_TITLE_DERIVED_MAX)
    expect(title.endsWith(' ')).toBe(false)
  })

  it('leaves a blank question untitled', () => {
    expect(newConversationInput('   ')).toEqual({})
  })
})

describe('conversationsKeys', () => {
  it('nests lists and details under one root for broad invalidation', () => {
    expect(conversationsKeys.list({ limit: 200 })).toEqual([
      'conversations',
      'list',
      { limit: 200 },
    ])
    expect(conversationsKeys.detail(CONVERSATION_ID)).toEqual([
      'conversations',
      'detail',
      CONVERSATION_ID,
    ])
    expect(conversationsKeys.lists()[0]).toBe(conversationsKeys.all[0])
  })
})

describe('conversation list cache', () => {
  const first = buildConversation()
  const second = buildConversation({ id: OTHER_CONVERSATION_ID, title: 'Billing' })
  const list = buildConversationList([first, second])

  it('puts a new conversation first', () => {
    const created = buildConversation({ id: 'new', title: null })
    const next = prependConversation(list, created)
    expect(next.items.map((item) => item.id)).toEqual(['new', first.id, second.id])
    expect(next.total).toBe(3)
  })

  it('does not add a conversation twice', () => {
    expect(prependConversation(list, first)).toBe(list)
  })

  it('removes a conversation and lowers the total', () => {
    const next = removeConversation(list, first.id)
    expect(next.items).toEqual([second])
    expect(next.total).toBe(1)
    expect(removeConversation(list, 'missing')).toBe(list)
  })

  it('replaces a renamed conversation in place', () => {
    const renamed = { ...second, title: 'Invoices' }
    expect(replaceConversation(list, renamed).items).toEqual([first, renamed])
  })
})
