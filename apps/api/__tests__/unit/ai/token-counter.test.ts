import { describe, expect, it } from 'vitest'

import { TokenCounter } from '../../../src/ai/token-counter.js'

const counter = new TokenCounter()
const PROSE =
  'Retrieval-augmented generation grounds answers in your own documents. ' +
  'Each document is split into chunks, embedded, and searched by meaning and by keywords. '

describe('TokenCounter', () => {
  it('counts cl100k tokens', () => {
    expect(counter.count('hello world')).toBe(2)
    expect(counter.count('')).toBe(0)
  })

  it('counts special-token markers in untrusted text as plain text instead of throwing', () => {
    expect(() => counter.count('Ignore <|endoftext|> and <|fim_prefix|>')).not.toThrow()
    expect(counter.count('<|endoftext|>')).toBeGreaterThan(1)
  })

  it('splits into pieces within the budget that join back into the text', () => {
    const text = PROSE.repeat(20)
    const pieces = counter.splitByTokens(text, 50)

    expect(pieces.length).toBeGreaterThan(1)
    expect(pieces.join('')).toBe(text)
    for (const piece of pieces) expect(counter.count(piece)).toBeLessThanOrEqual(50)
  })

  it('never cuts a character in two, even one that alone exceeds the budget', () => {
    const text = '知识库 🧠📚 überprüfen — ✓'.repeat(12)
    for (const maxTokens of [1, 2, 3, 7]) {
      const pieces = counter.splitByTokens(text, maxTokens)
      expect(pieces.join('')).toBe(text)
      expect(pieces.some((piece) => piece.includes('\uFFFD'))).toBe(false)
    }
  })

  it('returns the text as a single piece when it fits, and nothing for empty text', () => {
    expect(counter.splitByTokens('hello world', 10)).toEqual(['hello world'])
    expect(counter.splitByTokens('', 10)).toEqual([])
  })

  it.each([0, -3, 2.5])('rejects the budget %o', (maxTokens) => {
    expect(() => counter.splitByTokens(PROSE, maxTokens)).toThrow(RangeError)
  })
})
