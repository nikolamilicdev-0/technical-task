// @vitest-environment node
import type { ChatDoneEvent, ChatMetaEvent } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import {
  ASSISTANT_MESSAGE_ID,
  buildCitations,
  buildConversationDetail,
  buildMessage,
  CONVERSATION_ID,
  CREATED_AT,
  USER_MESSAGE_ID,
} from '@/__tests__/fixtures/chat'
import { INITIAL_CHAT_STREAM_STATE } from '@/features/chat/lib/chat-stream-reducer'
import { appendExchange } from '@/features/chat/lib/commit-stream-result'
import type { ChatStreamState, StreamResult } from '@/features/chat/types'

const SETTLED_AT = '2026-09-30T10:05:00.000Z'
const PLACEHOLDERS = { question: 'temp-question', answer: 'temp-answer' }
const EARLIER = buildMessage({ id: 'aaaaaaaa-0000-4000-8000-000000000001' })

const META: ChatMetaEvent = {
  type: 'meta',
  conversationId: CONVERSATION_ID,
  userMessageId: USER_MESSAGE_ID,
  title: 'Setting up',
}
const DONE: ChatDoneEvent = {
  type: 'done',
  userMessageId: USER_MESSAGE_ID,
  assistantMessageId: ASSISTANT_MESSAGE_ID,
  finishReason: 'stop',
}

function result(state: Partial<ChatStreamState>, done: ChatDoneEvent | null): StreamResult {
  return {
    state: {
      ...INITIAL_CHAT_STREAM_STATE,
      status: done ? 'done' : 'stopped',
      pendingUserMessage: { content: 'How do I set up?', createdAt: CREATED_AT },
      meta: META,
      draft: 'Install the CLI [2].',
      citations: buildCitations(2),
      ...state,
    },
    done,
    placeholderIds: PLACEHOLDERS,
    settledAt: SETTLED_AT,
  }
}

describe('appendExchange', () => {
  it('appends the finished exchange with the stored ids, cited sources and usage', () => {
    const usage = {
      promptTokens: 90,
      completionTokens: 10,
      totalTokens: 100,
      model: 'gemini-3.5-flash-lite',
      estimated: false,
    }
    const next = appendExchange(buildConversationDetail([EARLIER]), result({ usage }, DONE))

    expect(next?.messages).toEqual([
      EARLIER,
      {
        id: USER_MESSAGE_ID,
        conversationId: CONVERSATION_ID,
        role: 'user',
        content: 'How do I set up?',
        citations: [],
        createdAt: CREATED_AT,
      },
      {
        id: ASSISTANT_MESSAGE_ID,
        conversationId: CONVERSATION_ID,
        role: 'assistant',
        content: 'Install the CLI [2].',
        citations: [
          expect.objectContaining({ index: 1, cited: false }),
          expect.objectContaining({ index: 2, cited: true }),
        ],
        finishReason: 'stop',
        model: 'gemini-3.5-flash-lite',
        usage: { promptTokens: 90, completionTokens: 10, totalTokens: 100, estimated: false },
        createdAt: SETTLED_AT,
      },
    ])
    expect(next?.conversation.updatedAt).toBe(SETTLED_AT)
  })

  it('keeps an interrupted partial answer as aborted under a placeholder id', () => {
    const next = appendExchange(buildConversationDetail(), result({}, null))
    expect(next?.messages[1]).toMatchObject({
      id: PLACEHOLDERS.answer,
      finishReason: 'aborted',
      content: 'Install the CLI [2].',
    })
    expect(next?.messages[1]).not.toHaveProperty('usage')
  })

  it('keeps only the question when the stream stopped before any text', () => {
    const next = appendExchange(buildConversationDetail(), result({ draft: '' }, null))
    expect(next?.messages.map((message) => message.role)).toEqual(['user'])
  })

  it('uses a placeholder for a question the API never confirmed', () => {
    const next = appendExchange(buildConversationDetail(), result({ meta: null, draft: '' }, null))
    expect(next?.messages[0]?.id).toBe(PLACEHOLDERS.question)
  })

  it('names an untitled conversation from meta but keeps an existing title', () => {
    const untitled = appendExchange(buildConversationDetail([], { title: null }), result({}, DONE))
    expect(untitled?.conversation.title).toBe('Setting up')
    const titled = appendExchange(buildConversationDetail([], { title: 'Mine' }), result({}, DONE))
    expect(titled?.conversation.title).toBe('Mine')
  })

  it('does not repeat messages a refetch already brought in', () => {
    const stored = buildMessage({ id: USER_MESSAGE_ID, content: 'How do I set up?' })
    const next = appendExchange(buildConversationDetail([EARLIER, stored]), result({}, DONE))
    expect(next?.messages.map((message) => message.id)).toEqual([
      EARLIER.id,
      USER_MESSAGE_ID,
      ASSISTANT_MESSAGE_ID,
    ])
  })

  it('leaves an uncached conversation to its next fetch', () => {
    expect(appendExchange(undefined, result({}, DONE))).toBeUndefined()
  })

  it('changes nothing without a question in flight', () => {
    const detail = buildConversationDetail([EARLIER])
    expect(appendExchange(detail, result({ pendingUserMessage: null }, DONE))).toBe(detail)
  })
})
