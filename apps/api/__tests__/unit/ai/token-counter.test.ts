import { Tiktoken } from 'js-tiktoken/lite'
import cl100k_base from 'js-tiktoken/ranks/cl100k_base'
import { describe, expect, it } from 'vitest'

import { TokenCounter } from '../../../src/ai/token-counter.js'
import { LINEAR_TIME_BUDGET_MS, LONE_SURROGATE, timed } from '../../fixtures/timing.js'

const counter = new TokenCounter()
const PROSE =
  'Retrieval-augmented generation grounds answers in your own documents. ' +
  'Each document is split into chunks, embedded, and searched by meaning and by keywords. '
const CODE = 'export function add(a: number, b: number): number {\n  return a + b\n}\n'
const CHINESE = '知识库把文档切成片段，再按语义和关键词检索。'
const CJK_LETTERS = '数据库索引查询优化分布式系统架构设计模式网络协议安全认证'

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

  it('counts ordinary text exactly as a plain cl100k encoder does', () => {
    const reference = new Tiktoken(cl100k_base)

    for (const text of [PROSE.repeat(20), CODE.repeat(10), CHINESE.repeat(10)]) {
      expect(counter.count(text)).toBe(reference.encode(text, [], []).length)
    }
  })

  it.each([
    ['20,000 spaces', `a${' '.repeat(20_000)}b`],
    ['8,000 letters', 'x'.repeat(8_000)],
    ['600 CJK letters', CJK_LETTERS.repeat(20)],
  ])('counts a run of %s in linear time', (_, text) => {
    const { value, ms } = timed(() => counter.count(text))

    expect(value).toBeGreaterThan(0)
    expect(ms).toBeLessThan(LINEAR_TIME_BUDGET_MS)
  })

  it('keeps each piece of a real U+FFFD run within the budget', () => {
    const text = `x ${'\uFFFD'.repeat(600)} y`

    const pieces = counter.splitByTokens(text, 50)

    expect(pieces.length).toBeGreaterThan(1)
    expect(pieces.join('')).toBe(text)
    for (const piece of pieces) expect(counter.count(piece)).toBeLessThanOrEqual(50)
  })

  it('splits a long run of astral letters without garbling a character', () => {
    const text = `a${'𠀀'.repeat(500)}`

    const pieces = counter.splitByTokens(text, 7)

    expect(pieces.join('')).toBe(text)
    expect(pieces.some((piece) => LONE_SURROGATE.test(piece) || piece.includes('\uFFFD'))).toBe(
      false
    )
  })

  it.each([0, -3, 2.5])('rejects the budget %o', (maxTokens) => {
    expect(() => counter.splitByTokens(PROSE, maxTokens)).toThrow(RangeError)
  })
})
