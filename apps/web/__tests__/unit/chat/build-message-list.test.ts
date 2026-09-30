// @vitest-environment node
import type { ChatDoneEvent, ChatMetaEvent } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import {
  ASSISTANT_MESSAGE_ID,
  buildCitations,
  buildMessage,
  CONVERSATION_ID,
  CREATED_AT,
  USER_MESSAGE_ID,
} from '@/__tests__/fixtures/chat'
import { PENDING_ANSWER_KEY, PENDING_QUESTION_KEY } from '@/features/chat/constants'
import { buildMessageList } from '@/features/chat/lib/build-message-list'
import { INITIAL_CHAT_STREAM_STATE } from '@/features/chat/lib/chat-stream-reducer'
import type { ChatStreamState } from '@/features/chat/types'

const EARLIER_QUESTION = buildMessage({ id: 'aaaaaaaa-0000-4000-8000-000000000001' })
const EARLIER_ANSWER = buildMessage({
  id: 'aaaaaaaa-0000-4000-8000-000000000002',
  role: 'assistant',
  content: 'Run the installer [1].',
  citations: buildCitations(1),
  finishReason: 'stop',
})
const HISTORY = [EARLIER_QUESTION, EARLIER_ANSWER]

const META: ChatMetaEvent = {
  type: 'meta',
  conversationId: CONVERSATION_ID,
  userMessageId: USER_MESSAGE_ID,
  title: null,
}
const DONE: ChatDoneEvent = {
  type: 'done',
  userMessageId: USER_MESSAGE_ID,
  assistantMessageId: ASSISTANT_MESSAGE_ID,
  finishReason: 'length',
}

function stream(overrides: Partial<ChatStreamState>): ChatStreamState {
  return {
    ...INITIAL_CHAT_STREAM_STATE,
    pendingUserMessage: { content: 'And then?', createdAt: CREATED_AT },
    ...overrides,
  }
}

const keys = (state: ChatStreamState) => buildMessageList(HISTORY, state).map((item) => item.key)

describe('buildMessageList', () => {
  it('shows the stored history as it is when nothing is in flight', () => {
    const items = buildMessageList(HISTORY, INITIAL_CHAT_STREAM_STATE)
    expect(items).toEqual([
      {
        key: EARLIER_QUESTION.id,
        author: 'user',
        content: EARLIER_QUESTION.content,
        citations: [],
        streaming: false,
      },
      {
        key: EARLIER_ANSWER.id,
        author: 'assistant',
        content: EARLIER_ANSWER.content,
        citations: EARLIER_ANSWER.citations,
        streaming: false,
        finishReason: 'stop',
      },
    ])
    // Same references, so memoised bubbles of the history skip re-rendering.
    expect(items[1]?.citations).toBe(EARLIER_ANSWER.citations)
  })

  it('adds the question and a streaming answer placeholder while connecting', () => {
    const items = buildMessageList(HISTORY, stream({ status: 'connecting' }))
    expect(items.slice(2)).toEqual([
      expect.objectContaining({ key: PENDING_QUESTION_KEY, author: 'user', content: 'And then?' }),
      expect.objectContaining({ key: PENDING_ANSWER_KEY, content: '', streaming: true }),
    ])
  })

  it('keys the question by its stored id and marks cited sources as the draft grows', () => {
    const state = stream({
      status: 'streaming',
      meta: META,
      draft: 'Open settings [2]',
      citations: buildCitations(2),
    })
    const [question, answer] = buildMessageList(HISTORY, state).slice(2)
    expect(question?.key).toBe(USER_MESSAGE_ID)
    expect(answer?.citations.map((citation) => citation.cited)).toEqual([false, true])
    expect(answer?.streaming).toBe(true)
  })

  it('keys a finished answer by its stored id and notes how it ended', () => {
    const state = stream({ status: 'done', meta: META, done: DONE, draft: 'Long answer' })
    expect(buildMessageList(HISTORY, state)[3]).toMatchObject({
      key: ASSISTANT_MESSAGE_ID,
      streaming: false,
      finishReason: 'length',
    })
  })

  it('notes a stopped answer as aborted', () => {
    const state = stream({ status: 'stopped', meta: META, draft: 'Partial' })
    expect(buildMessageList(HISTORY, state)[3]?.finishReason).toBe('aborted')
  })

  it('keeps a failed partial answer, and only the question when nothing arrived', () => {
    const failure = { code: 'ai_provider_error' as const, message: null, retryAfter: null }
    expect(keys(stream({ status: 'error', error: failure, draft: 'Part' }))).toHaveLength(4)
    expect(keys(stream({ status: 'error', error: failure }))).toEqual([
      EARLIER_QUESTION.id,
      EARLIER_ANSWER.id,
      PENDING_QUESTION_KEY,
    ])
  })

  it('drops the exchange once the history holds its question', () => {
    const stored = buildMessage({ id: USER_MESSAGE_ID, content: 'And then?' })
    const state = stream({ status: 'done', meta: META, done: DONE, draft: 'Answer' })
    const items = buildMessageList([...HISTORY, stored], state)
    expect(items.map((item) => item.key)).toEqual([
      EARLIER_QUESTION.id,
      EARLIER_ANSWER.id,
      USER_MESSAGE_ID,
    ])
  })
})
