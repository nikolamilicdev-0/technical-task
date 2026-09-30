// @vitest-environment node
import type { ChatDoneEvent, ChatMetaEvent, ChatUsage } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import {
  ASSISTANT_MESSAGE_ID,
  buildCitations,
  CONVERSATION_ID,
  CREATED_AT,
  USER_MESSAGE_ID,
} from '@/__tests__/fixtures/chat'
import {
  chatStreamReducer,
  INITIAL_CHAT_STREAM_STATE,
  isReceiving,
  toStreamAction,
} from '@/features/chat/lib/chat-stream-reducer'
import type {
  ChatStreamAction,
  ChatStreamState,
  ChatStreamStatus,
  PendingUserMessage,
  StreamError,
} from '@/features/chat/types'

const QUESTION: PendingUserMessage = { content: 'How do I set up?', createdAt: CREATED_AT }
const META: ChatMetaEvent = {
  type: 'meta',
  conversationId: CONVERSATION_ID,
  userMessageId: USER_MESSAGE_ID,
  title: 'How do I set up?',
}
const USAGE: ChatUsage = {
  promptTokens: 100,
  completionTokens: 20,
  totalTokens: 120,
  model: 'gemini-3.5-flash-lite',
  estimated: false,
}
const DONE: ChatDoneEvent = {
  type: 'done',
  userMessageId: USER_MESSAGE_ID,
  assistantMessageId: ASSISTANT_MESSAGE_ID,
  finishReason: 'stop',
}
const FAILURE: StreamError = {
  code: 'ai_provider_error',
  message: 'Upstream failed',
  retryAfter: null,
}

const reduce = (state: ChatStreamState, ...actions: ChatStreamAction[]) =>
  actions.reduce(chatStreamReducer, state)

const connecting = reduce(INITIAL_CHAT_STREAM_STATE, { type: 'start', message: QUESTION })
const streaming = reduce(connecting, { type: 'meta', meta: META }, { type: 'delta', text: 'Run ' })

function settledIn(status: ChatStreamStatus): ChatStreamState {
  return { ...streaming, status }
}

describe('chatStreamReducer', () => {
  it('starts connecting with the question and nothing else', () => {
    expect(connecting).toEqual({
      ...INITIAL_CHAT_STREAM_STATE,
      status: 'connecting',
      pendingUserMessage: QUESTION,
    })
  })

  it('refuses a second question while an answer is on its way', () => {
    const next = { type: 'start', message: { ...QUESTION, content: 'Another' } } as const
    expect(chatStreamReducer(connecting, next)).toBe(connecting)
    expect(chatStreamReducer(streaming, next)).toBe(streaming)
  })

  it.each(['done', 'stopped', 'error'] as const)(
    'starts afresh after the previous answer settled (%s)',
    (status) => {
      const started = chatStreamReducer(settledIn(status), { type: 'start', message: QUESTION })
      expect(started).toEqual(connecting)
    }
  )

  it('keeps the stored question id and streams once meta arrives', () => {
    const next = chatStreamReducer(connecting, { type: 'meta', meta: META })
    expect(next.status).toBe('streaming')
    expect(next.meta).toEqual(META)
  })

  it('stores the sources without changing the status', () => {
    const citations = buildCitations(2)
    const next = chatStreamReducer(streaming, { type: 'sources', citations })
    expect(next.citations).toBe(citations)
    expect(next.status).toBe('streaming')
  })

  it('appends deltas to the draft', () => {
    const next = reduce(streaming, { type: 'delta', text: 'the ' }, { type: 'delta', text: 'CLI.' })
    expect(next.draft).toBe('Run the CLI.')
  })

  it('treats a first delta as streaming even without meta', () => {
    const next = chatStreamReducer(connecting, { type: 'delta', text: 'Hi' })
    expect(next).toMatchObject({ status: 'streaming', draft: 'Hi' })
  })

  it('stores usage', () => {
    expect(chatStreamReducer(streaming, { type: 'usage', usage: USAGE }).usage).toEqual(USAGE)
  })

  it('settles as done and keeps the exchange for the cache commit', () => {
    const next = chatStreamReducer(streaming, { type: 'done', done: DONE })
    expect(next).toMatchObject({ status: 'done', done: DONE, draft: 'Run ', meta: META })
  })

  it('settles as stopped and keeps the partial answer', () => {
    const next = chatStreamReducer(streaming, { type: 'stop' })
    expect(next).toMatchObject({ status: 'stopped', draft: 'Run ', pendingUserMessage: QUESTION })
  })

  it('settles as failed with the error and keeps the question for a retry', () => {
    const next = chatStreamReducer(connecting, { type: 'fail', error: FAILURE })
    expect(next).toMatchObject({ status: 'error', error: FAILURE, pendingUserMessage: QUESTION })
  })

  const lateActions: ChatStreamAction[] = [
    { type: 'meta', meta: META },
    { type: 'sources', citations: buildCitations(1) },
    { type: 'delta', text: 'late' },
    { type: 'usage', usage: USAGE },
    { type: 'done', done: DONE },
    { type: 'stop' },
    { type: 'fail', error: FAILURE },
  ]
  const idleOrSettled: ChatStreamState[] = [
    INITIAL_CHAT_STREAM_STATE,
    settledIn('done'),
    settledIn('stopped'),
    settledIn('error'),
  ]

  it.each(idleOrSettled.flatMap((state) => lateActions.map((action) => [state, action] as const)))(
    'ignores stream events unless receiving (%#)',
    (state, action) => {
      expect(chatStreamReducer(state, action)).toBe(state)
    }
  )

  it.each([connecting, streaming, settledIn('done'), settledIn('error')])(
    'resets to idle from any state (%#)',
    (state) => {
      expect(chatStreamReducer(state, { type: 'reset' })).toBe(INITIAL_CHAT_STREAM_STATE)
    }
  )
})

describe('toStreamAction', () => {
  it('maps every stream event to its action', () => {
    const citations = buildCitations(1)
    const usageEvent = { type: 'usage', ...USAGE } as const
    expect(toStreamAction(META)).toEqual({ type: 'meta', meta: META })
    expect(toStreamAction({ type: 'sources', citations })).toEqual({ type: 'sources', citations })
    expect(toStreamAction({ type: 'delta', text: 'Hi' })).toEqual({ type: 'delta', text: 'Hi' })
    expect(toStreamAction(usageEvent)).toEqual({ type: 'usage', usage: USAGE })
    expect(toStreamAction(DONE)).toEqual({ type: 'done', done: DONE })
    expect(
      toStreamAction({ type: 'error', code: 'rate_limited', message: 'Slow', retryAfter: 5 })
    ).toEqual({ type: 'fail', error: { code: 'rate_limited', message: 'Slow', retryAfter: 5 } })
  })
})

describe('isReceiving', () => {
  it.each([
    ['idle', false],
    ['connecting', true],
    ['streaming', true],
    ['done', false],
    ['stopped', false],
    ['error', false],
  ] as const)('%s → %s', (status, expected) => {
    expect(isReceiving(status)).toBe(expected)
  })
})
