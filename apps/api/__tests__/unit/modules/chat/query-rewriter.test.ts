import {
  AiProviderError,
  type ChatCompletion,
  type ChatRequest,
  FakeChatModel,
  type FakeChatReply,
} from '@kb/ai'
import { Logger } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import type { UserContext } from '../../../../src/database/user-context.types.js'
import type { HistoryMessage } from '../../../../src/modules/chat/chat.types.js'
import { QueryRewriter } from '../../../../src/modules/chat/query-rewriter.js'
import type { UsageRecorder } from '../../../../src/modules/usage/usage-recorder.js'
import type { UsageEvent } from '../../../../src/modules/usage/usage.types.js'
import { WordCounter } from '../../../fakes/word-counter.js'
import { buildTestConfig, TEST_USER } from '../../../fixtures.js'
import { TEST_CONVERSATION_ID } from '../../../fixtures/chat.js'

const USER: UserContext = { userId: TEST_USER.id, db: {} as DatabaseClient }
const HISTORY: HistoryMessage[] = [
  { role: 'user', content: 'What is the Pro plan?' },
  { role: 'assistant', content: 'The Pro plan adds SSO [1].' },
]
const QUICK_TIMEOUT_MS = 20

/** Never answers on its own; only an abort ends the call, as with a stalled provider. */
class StalledChatModel extends FakeChatModel {
  override complete(request: ChatRequest): Promise<ChatCompletion> {
    return new Promise((_, reject) => {
      request.signal?.addEventListener('abort', () => {
        reject(new AiProviderError('aborted', 'The chat request was aborted', { provider: 'fake' }))
      })
    })
  }
}

class QuickRewriter extends QueryRewriter {
  protected override readonly timeoutMs = QUICK_TIMEOUT_MS
}

let warn: MockInstance<Logger['warn']>

beforeEach(() => {
  warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function setup(chat: FakeChatModel, env: Record<string, string> = {}) {
  const events: UsageEvent[] = []
  const usage = { record: (event: UsageEvent) => events.push(event) } as unknown as UsageRecorder
  const rewriter = new QuickRewriter(buildTestConfig(env), chat, new WordCounter(), usage)
  return { rewriter, events }
}

function followUp(history: HistoryMessage[] = HISTORY, signal = new AbortController().signal) {
  return {
    question: 'what about its pricing?',
    history,
    conversationId: TEST_CONVERSATION_ID,
    signal,
  }
}

function chatReplying(...replies: (string | FakeChatReply)[]): FakeChatModel {
  return new FakeChatModel({ replies })
}

describe('QueryRewriter', () => {
  it('turns a follow-up into the model query and meters the call', async () => {
    const chat = chatReplying({
      text: '"Pro plan pricing"',
      usage: { promptTokens: 30, completionTokens: 3, totalTokens: 33 },
    })
    const { rewriter, events } = setup(chat)

    await expect(rewriter.rewrite(USER, followUp())).resolves.toBe('Pro plan pricing')

    expect(chat.requests[0]?.messages.at(-1)?.content).toContain('what about its pricing?')
    expect(chat.requests[0]?.maxTokens).toBe(256)
    expect(events).toEqual([
      expect.objectContaining({
        userId: TEST_USER.id,
        kind: 'query_rewrite',
        provider: 'fake',
        model: 'fake-chat',
        usage: { promptTokens: 30, completionTokens: 3, totalTokens: 33, estimated: false },
        conversationId: TEST_CONVERSATION_ID,
      }),
    ])
  })

  it('estimates the usage when the provider reports none', async () => {
    const { rewriter, events } = setup(chatReplying('Pro plan pricing'))

    await rewriter.rewrite(USER, followUp())

    expect(events[0]?.usage).toMatchObject({ completionTokens: 3, estimated: true })
  })

  it('leaves a first question alone without calling the model', async () => {
    const chat = chatReplying('unused')
    const { rewriter, events } = setup(chat)

    await expect(rewriter.rewrite(USER, followUp([]))).resolves.toBeNull()

    expect(chat.requests).toEqual([])
    expect(events).toEqual([])
  })

  it('does nothing when RAG_QUERY_REWRITE is off', async () => {
    const chat = chatReplying('unused')
    const { rewriter } = setup(chat, { RAG_QUERY_REWRITE: 'false' })

    await expect(rewriter.rewrite(USER, followUp())).resolves.toBeNull()
    expect(chat.requests).toEqual([])
  })

  it('gives up after the timeout so the question is searched as asked', async () => {
    const { rewriter, events } = setup(new StalledChatModel())
    const startedAt = performance.now()

    await expect(rewriter.rewrite(USER, followUp())).resolves.toBeNull()

    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(QUICK_TIMEOUT_MS - 1)
    expect(events).toEqual([])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Query rewrite failed'))
  })

  it('stops with the caller and stays quiet about it', async () => {
    const { rewriter } = setup(new StalledChatModel())
    const caller = new AbortController()

    const rewritten = rewriter.rewrite(USER, followUp(HISTORY, caller.signal))
    caller.abort()

    await expect(rewritten).resolves.toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it.each([
    [
      'a provider failure',
      { error: new AiProviderError('rate_limited', 'Slow', { provider: 'x' }) },
    ],
    ['an empty answer', { text: '  ' }],
  ])('falls back to the question on %s', async (_, reply) => {
    const { rewriter } = setup(chatReplying(reply))

    await expect(rewriter.rewrite(USER, followUp())).resolves.toBeNull()
    expect(warn).toHaveBeenCalledOnce()
  })
})
