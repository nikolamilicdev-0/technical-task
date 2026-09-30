import {
  type ChatSseEvent,
  chatResultSchema,
  chatSseEventSchemas,
  MAX_SCOPE_DOCUMENTS,
  MESSAGE_MAX_LENGTH,
  parseChatSseEvent,
  sendMessageSchema,
} from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { buildCitation, buildMessage, IDS, issuePaths } from '../fixtures.js'

const documentIds = (count: number): string[] => Array.from({ length: count }, () => IDS.document)

const EVENTS = {
  meta: {
    type: 'meta',
    conversationId: IDS.conversation,
    userMessageId: IDS.userMessage,
    title: 'First week',
  },
  sources: { type: 'sources', citations: [buildCitation({ cited: false })] },
  delta: { type: 'delta', text: 'Pair with ' },
  usage: {
    type: 'usage',
    promptTokens: 812,
    completionTokens: 64,
    totalTokens: 876,
    model: 'gpt-4o-mini',
    estimated: false,
  },
  done: {
    type: 'done',
    userMessageId: IDS.userMessage,
    assistantMessageId: IDS.assistantMessage,
    finishReason: 'stop',
  },
  error: { type: 'error', code: 'rate_limited', message: 'Slow down', retryAfter: 12 },
} satisfies { [TType in ChatSseEvent['type']]: Extract<ChatSseEvent, { type: TType }> }

describe('sendMessageSchema', () => {
  it('trims the question and keeps an optional document scope', () => {
    expect(sendMessageSchema.parse({ content: '  Hi?  ', documentIds: [IDS.document] })).toEqual({
      content: 'Hi?',
      documentIds: [IDS.document],
    })
  })

  it('accepts the maximum scope and length', () => {
    const input = {
      content: 'q'.repeat(MESSAGE_MAX_LENGTH),
      documentIds: documentIds(MAX_SCOPE_DOCUMENTS),
    }
    expect(sendMessageSchema.safeParse(input).success).toBe(true)
  })

  it.each([
    ['a blank question', { content: ' \n ' }, 'content'],
    ['an overlong question', { content: 'q'.repeat(MESSAGE_MAX_LENGTH + 1) }, 'content'],
    ['a NUL in the question', { content: 'Hi\u0000?' }, 'content'],
    [
      'an empty scope (omit it to search everything)',
      { content: 'Hi', documentIds: [] },
      'documentIds',
    ],
    [
      'too many scoped documents',
      { content: 'Hi', documentIds: documentIds(MAX_SCOPE_DOCUMENTS + 1) },
      'documentIds',
    ],
    ['a non-uuid document id', { content: 'Hi', documentIds: ['doc-1'] }, 'documentIds.0'],
  ])('rejects %s', (_, input, path) => {
    expect(issuePaths(sendMessageSchema, input)).toContain(path)
  })
})

describe('chatResultSchema', () => {
  const exchange = {
    userMessage: buildMessage(),
    assistantMessage: buildMessage({ id: IDS.assistantMessage, role: 'assistant' }),
  }

  it.each([
    ['with usage', { ...exchange, usage: EVENTS.usage }],
    ['without usage', exchange],
  ])('accepts a result %s', (_, input) => {
    expect(chatResultSchema.safeParse(input).success).toBe(true)
  })
})

describe('chatSseEventSchemas', () => {
  it('has exactly one schema per event type, in wire order', () => {
    expect(Object.keys(chatSseEventSchemas)).toEqual([
      'meta',
      'sources',
      'delta',
      'usage',
      'done',
      'error',
    ])
  })
})

describe('parseChatSseEvent', () => {
  it.each(Object.entries(EVENTS))('parses a valid %s frame', (name, event) => {
    expect(parseChatSseEvent(name, JSON.stringify(event))).toEqual(event)
  })

  it('accepts a meta event before the conversation has a title', () => {
    const frame = JSON.stringify({ ...EVENTS.meta, title: null })
    expect(parseChatSseEvent('meta', frame)).toEqual({ ...EVENTS.meta, title: null })
  })

  it.each([
    ['an unknown event name', 'ping', JSON.stringify(EVENTS.delta)],
    ['an inherited property name', 'constructor', JSON.stringify(EVENTS.delta)],
    ['malformed JSON', 'delta', '{"type":"delta","text":'],
    ['an empty data field', 'delta', ''],
    ['a payload of another event type', 'delta', JSON.stringify(EVENTS.meta)],
    ['a payload missing required fields', 'done', JSON.stringify({ type: 'done' })],
    ['an unknown error code', 'error', JSON.stringify({ ...EVENTS.error, code: 'teapot' })],
  ])('returns null for %s', (_, name, data) => {
    expect(parseChatSseEvent(name, data)).toBeNull()
  })
})
