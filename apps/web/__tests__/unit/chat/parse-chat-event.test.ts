// @vitest-environment node
import type { ChatSseEvent } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import {
  ASSISTANT_MESSAGE_ID,
  buildCitation,
  CONVERSATION_ID,
  USER_MESSAGE_ID,
} from '@/__tests__/fixtures/chat'
import { parseChatEvent } from '@/features/chat/lib/parse-chat-event'
import type { SseMessage } from '@/features/chat/types'

const message = (event: string, payload: unknown): SseMessage => ({
  event,
  data: JSON.stringify(payload),
  id: '',
})

const EVENTS: ChatSseEvent[] = [
  { type: 'meta', conversationId: CONVERSATION_ID, userMessageId: USER_MESSAGE_ID, title: null },
  { type: 'sources', citations: [buildCitation()] },
  { type: 'delta', text: 'Install the CLI [1].' },
  {
    type: 'usage',
    promptTokens: 120,
    completionTokens: 30,
    totalTokens: 150,
    model: 'gemini-3.5-flash-lite',
    estimated: false,
  },
  {
    type: 'done',
    userMessageId: USER_MESSAGE_ID,
    assistantMessageId: ASSISTANT_MESSAGE_ID,
    finishReason: 'stop',
  },
  { type: 'error', code: 'rate_limited', message: 'Slow down', retryAfter: 12 },
]

describe('parseChatEvent', () => {
  it.each(EVENTS.map((event) => [event.type, event] as const))(
    'reads a %s event',
    (_type, event) => {
      expect(parseChatEvent(message(event.type, event))).toEqual(event)
    }
  )

  it('ignores event names the chat contract does not define', () => {
    expect(parseChatEvent(message('ping', { type: 'ping' }))).toBeNull()
  })

  it('ignores unnamed frames, which arrive as "message" events', () => {
    expect(parseChatEvent(message('message', { type: 'delta', text: 'Hi' }))).toBeNull()
  })

  it('ignores malformed JSON', () => {
    expect(parseChatEvent({ event: 'delta', data: '{"type":"delta","te', id: '' })).toBeNull()
  })

  it('ignores payloads that break the contract', () => {
    expect(parseChatEvent(message('delta', { type: 'delta' }))).toBeNull()
    expect(parseChatEvent(message('meta', { type: 'meta', conversationId: 'x' }))).toBeNull()
  })

  it('ignores a payload whose type disagrees with the event name', () => {
    expect(parseChatEvent(message('delta', EVENTS[4]))).toBeNull()
  })
})
