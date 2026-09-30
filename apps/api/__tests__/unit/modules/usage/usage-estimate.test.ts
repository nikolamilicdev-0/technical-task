import { describe, expect, it } from 'vitest'

import { TokenCounter } from '../../../../src/ai/token-counter.js'
import {
  estimateChatUsage,
  estimateEmbeddingUsage,
  meterUsage,
} from '../../../../src/modules/usage/usage-estimate.js'

const counter = new TokenCounter()
const REPORTED = { promptTokens: 12, completionTokens: 0, totalTokens: 12 }
const ESTIMATE = { promptTokens: 9, completionTokens: 0, totalTokens: 9 }

describe('estimateEmbeddingUsage', () => {
  it('counts the input tokens of every text; embeddings produce no completion', () => {
    expect(estimateEmbeddingUsage(['hello world', 'Title\n\nBody text.'], counter)).toEqual({
      promptTokens: counter.count('hello world') + counter.count('Title\n\nBody text.'),
      completionTokens: 0,
      totalTokens: counter.count('hello world') + counter.count('Title\n\nBody text.'),
    })
  })

  it('costs nothing for no texts', () => {
    expect(estimateEmbeddingUsage([], counter)).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    })
  })
})

describe('estimateChatUsage', () => {
  it('counts every prompt message plus four tokens of chat framing, and the answer', () => {
    const messages = [
      { role: 'system' as const, content: 'Answer from the sources.' },
      { role: 'user' as const, content: 'What does it cost?' },
    ]
    const promptTokens =
      counter.count('Answer from the sources.') + counter.count('What does it cost?') + 2 * 4

    expect(estimateChatUsage(messages, 'Twenty euros [1].', counter)).toEqual({
      promptTokens,
      completionTokens: counter.count('Twenty euros [1].'),
      totalTokens: promptTokens + counter.count('Twenty euros [1].'),
    })
  })
})

describe('meterUsage', () => {
  it('prefers what the provider reported', () => {
    expect(meterUsage(REPORTED, () => ESTIMATE)).toEqual({ ...REPORTED, estimated: false })
  })

  it.each([
    ['no usage at all', undefined],
    ['an all-zero report', { promptTokens: 0, completionTokens: 0, totalTokens: 0 }],
  ])('falls back to the estimate, flagged, for %s', (_, reported) => {
    expect(meterUsage(reported, () => ESTIMATE)).toEqual({ ...ESTIMATE, estimated: true })
  })
})
