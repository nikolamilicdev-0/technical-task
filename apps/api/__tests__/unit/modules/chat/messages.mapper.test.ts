import { describe, expect, it } from 'vitest'

import type { AnswerRecord } from '../../../../src/modules/chat/chat.types.js'
import {
  toAnswerInsert,
  toMessage,
  toQuestionInsert,
} from '../../../../src/modules/chat/messages.mapper.js'
import {
  buildCitation,
  buildMessageRow,
  TEST_CONVERSATION_ID,
  TEST_MESSAGE_ID,
} from '../../../fixtures/chat.js'
import { API_TIMESTAMP } from '../../../fixtures/documents.js'

const METADATA = {
  retrieval: {
    mode: 'hybrid' as const,
    query: 'what about its pricing?',
    rewrittenQuery: 'Pro plan pricing',
    sourceCount: 1,
    latencyMs: 120,
  },
  timing: { firstTokenMs: 480, totalMs: 1_900 },
}

describe('toMessage', () => {
  it('maps a question without model, finish reason or usage', () => {
    expect(toMessage(buildMessageRow())).toEqual({
      id: TEST_MESSAGE_ID,
      conversationId: TEST_CONVERSATION_ID,
      role: 'user',
      content: 'What does the Pro plan cost?',
      citations: [],
      createdAt: API_TIMESTAMP,
    })
  })

  it('maps an answer with its citation snapshot and usage', () => {
    const citation = buildCitation({ cited: true })

    const message = toMessage(
      buildMessageRow({
        role: 'assistant',
        content: 'It costs 20 euros [1].',
        citations: [citation],
        model: 'gemini-3.5-flash-lite',
        finish_reason: 'stop',
        prompt_tokens: 900,
        completion_tokens: 40,
        usage_estimated: true,
      })
    )

    expect(message).toMatchObject({
      role: 'assistant',
      citations: [citation],
      model: 'gemini-3.5-flash-lite',
      finishReason: 'stop',
      usage: { promptTokens: 900, completionTokens: 40, totalTokens: 940, estimated: true },
    })
  })

  it('rejects a citation snapshot that no longer matches the contract', () => {
    const row = buildMessageRow({ citations: [{ index: 0, documentId: 'nope' }] })

    expect(() => toMessage(row)).toThrow()
  })
})

describe('message inserts', () => {
  it('stores a question as a bare user message', () => {
    expect(toQuestionInsert(TEST_CONVERSATION_ID, 'Hi')).toEqual({
      conversation_id: TEST_CONVERSATION_ID,
      role: 'user',
      content: 'Hi',
    })
  })

  it('stores an answer with citations, provider details, usage and diagnostics', () => {
    const answer: AnswerRecord = {
      conversationId: TEST_CONVERSATION_ID,
      content: 'It costs 20 euros [1].',
      citations: [buildCitation({ cited: true })],
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
      finishReason: 'aborted',
      usage: { promptTokens: 900, completionTokens: 12, totalTokens: 912, estimated: true },
      metadata: METADATA,
    }

    expect(toAnswerInsert(answer)).toEqual({
      conversation_id: TEST_CONVERSATION_ID,
      role: 'assistant',
      content: 'It costs 20 euros [1].',
      citations: [buildCitation({ cited: true })],
      metadata: METADATA,
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
      finish_reason: 'aborted',
      prompt_tokens: 900,
      completion_tokens: 12,
      usage_estimated: true,
    })
  })
})
