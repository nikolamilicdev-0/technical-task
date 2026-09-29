import { citationSchema, FINISH_REASONS, messageSchema } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { buildCitation, buildMessage, IDS, issuePaths } from '../fixtures.js'

describe('citationSchema', () => {
  it.each([
    ['a cited source', buildCitation()],
    ['an uncited source without heading', buildCitation({ cited: false, headingPath: '' })],
  ])('accepts %s', (_, input) => {
    expect(citationSchema.safeParse(input).success).toBe(true)
  })

  it.each([
    ['a zero index (indices are 1-based)', { index: 0 }, 'index'],
    ['a fractional index', { index: 1.5 }, 'index'],
    ['a negative chunk index', { chunkIndex: -1 }, 'chunkIndex'],
    ['a non-uuid document id', { documentId: 'doc-1' }, 'documentId'],
    ['a non-finite score', { score: Number.POSITIVE_INFINITY }, 'score'],
    ['a missing cited flag', { cited: undefined }, 'cited'],
  ])('rejects %s', (_, overrides, path) => {
    expect(issuePaths(citationSchema, { ...buildCitation(), ...overrides })).toContain(path)
  })
})

describe('messageSchema', () => {
  it.each([
    ['a user message without assistant metadata', buildMessage()],
    [
      'an assistant message with citations and usage',
      buildMessage({
        id: IDS.assistantMessage,
        role: 'assistant',
        content: 'Pair with your buddy on day one [1].',
        citations: [buildCitation()],
        model: 'gpt-4o-mini',
        finishReason: 'stop',
        usage: { promptTokens: 812, completionTokens: 64, totalTokens: 876, estimated: false },
      }),
    ],
    [
      'a partial answer persisted after the client aborted',
      buildMessage({ role: 'assistant', finishReason: 'aborted' }),
    ],
  ])('accepts %s', (_, input) => {
    expect(messageSchema.safeParse(input).success).toBe(true)
  })

  it.each([
    ['a system role', { role: 'system' }, 'role'],
    ['an unknown finish reason', { finishReason: 'timeout' }, 'finishReason'],
    [
      'negative token counts',
      { usage: { promptTokens: -1, completionTokens: 0, totalTokens: 0, estimated: false } },
      'usage.promptTokens',
    ],
    [
      'fractional token counts',
      { usage: { promptTokens: 1, completionTokens: 0.5, totalTokens: 2, estimated: true } },
      'usage.completionTokens',
    ],
    ['an invalid citation', { citations: [{ ...buildCitation(), index: 0 }] }, 'citations.0.index'],
  ])('rejects %s', (_, overrides, path) => {
    expect(issuePaths(messageSchema, { ...buildMessage(), ...overrides })).toContain(path)
  })

  it('covers every way an assistant turn can end', () => {
    expect(FINISH_REASONS).toEqual([
      'stop',
      'length',
      'content_filter',
      'aborted',
      'error',
      'unknown',
    ])
  })
})
