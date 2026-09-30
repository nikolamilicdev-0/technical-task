import type { ChatSseEvent } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import { collectChatResult } from '../../../../src/modules/chat/chat-result-collector.js'
import type { ChatEventStream, ChatRunOutcome } from '../../../../src/modules/chat/chat.types.js'
import { buildCitation, buildMessage, TEST_CONVERSATION_ID } from '../../../fixtures/chat.js'

const QUESTION = buildMessage()
const ANSWER = buildMessage({
  id: '8e9f0a1b-2c3d-4e5f-9a6b-7c8d9e0f1a2b',
  role: 'assistant',
  content: 'It costs 20 euros [1].',
  citations: [buildCitation({ cited: true })],
  model: 'fake-chat',
  finishReason: 'stop',
  usage: { promptTokens: 40, completionTokens: 8, totalTokens: 48, estimated: false },
})
const USAGE = { promptTokens: 40, completionTokens: 8, totalTokens: 48, estimated: false }
const STORED: ChatRunOutcome = { userMessage: QUESTION, assistantMessage: ANSWER }

const META: ChatSseEvent = {
  type: 'meta',
  conversationId: TEST_CONVERSATION_ID,
  userMessageId: QUESTION.id,
  title: 'Pricing',
}
const DONE: ChatSseEvent = {
  type: 'done',
  userMessageId: QUESTION.id,
  assistantMessageId: ANSWER.id,
  finishReason: 'stop',
}

async function* run(
  events: readonly ChatSseEvent[],
  outcome: ChatRunOutcome | null = STORED
): ChatEventStream {
  for (const event of events) yield event
  return outcome
}

describe('collectChatResult', () => {
  it('returns both stored messages and the usage once the run is done', async () => {
    const result = await collectChatResult(
      run([
        META,
        { type: 'sources', citations: [buildCitation()] },
        { type: 'delta', text: 'It costs 20 euros [1].' },
        { type: 'usage', ...USAGE, model: 'fake-chat' },
        DONE,
      ])
    )

    expect(result).toEqual({
      userMessage: QUESTION,
      assistantMessage: ANSWER,
      usage: { ...USAGE, model: 'fake-chat' },
    })
  })

  it('leaves the usage out when the run reported none', async () => {
    const result = await collectChatResult(run([META, DONE]))

    expect(result).not.toHaveProperty('usage')
  })

  it('throws the error event as the exception with its contract status', async () => {
    const failed = run(
      [META, { type: 'error', code: 'ai_provider_unavailable', message: 'Busy', retryAfter: 5 }],
      { userMessage: QUESTION, assistantMessage: null }
    )

    const error: unknown = await collectChatResult(failed).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiHttpException)
    expect(error).toMatchObject({
      body: { code: 'ai_provider_unavailable', messages: ['Busy'], retryAfter: 5 },
    })
    expect((error as ApiHttpException).getStatus()).toBe(503)
  })

  it('returns null for a run that stopped without an answer, as after a client abort', async () => {
    await expect(
      collectChatResult(run([META, { type: 'delta', text: 'Part' }]))
    ).resolves.toBeNull()
    await expect(collectChatResult(run([], null))).resolves.toBeNull()
  })
})
