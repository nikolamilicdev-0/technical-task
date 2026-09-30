import { describe, expect, it } from 'vitest'

import {
  containsNul,
  countCodePoints,
  splitsSurrogatePair,
  takeCodePoints,
  truncateUtf16,
} from '../../../../src/common/utils/text.js'

// One code point, two UTF-16 code units.
const GLOBE = '🌍'

describe('countCodePoints', () => {
  it('counts characters the way Postgres char_length does', () => {
    expect(countCodePoints('')).toBe(0)
    expect(countCodePoints('héllo')).toBe(5)
    expect(countCodePoints(`${GLOBE}${GLOBE}!`)).toBe(3)
  })
})

describe('takeCodePoints', () => {
  it('returns the first code points, the way Postgres left() does', () => {
    expect(takeCodePoints(`${GLOBE}ab${GLOBE}`, 3)).toBe(`${GLOBE}ab`)
    expect(takeCodePoints('abc', 0)).toBe('')
  })

  it('returns short text whole', () => {
    expect(takeCodePoints('abc', 240)).toBe('abc')
  })
})

describe('truncateUtf16', () => {
  it('keeps text within the limit unchanged', () => {
    expect(truncateUtf16('abc', 3)).toBe('abc')
  })

  it('cuts to the limit in UTF-16 code units', () => {
    expect(truncateUtf16('abcdef', 4)).toBe('abcd')
  })

  it('never keeps half of a surrogate pair', () => {
    expect(truncateUtf16(`ab${GLOBE}`, 3)).toBe('ab')
    expect(truncateUtf16(`ab${GLOBE}`, 4)).toBe(`ab${GLOBE}`)
  })
})

describe('splitsSurrogatePair', () => {
  it('is true only between the two halves of a pair', () => {
    const text = `a${GLOBE}b`

    expect([0, 1, 2, 3, 4].map((index) => splitsSurrogatePair(text, index))).toEqual([
      false,
      false,
      true,
      false,
      false,
    ])
  })

  it('is false outside the text', () => {
    expect(splitsSurrogatePair(GLOBE, -1)).toBe(false)
    expect(splitsSurrogatePair(GLOBE, 5)).toBe(false)
  })
})

describe('containsNul', () => {
  it('finds U+0000 anywhere, and nothing else', () => {
    expect(containsNul('a\u0000b')).toBe(true)
    expect(containsNul('\u0000')).toBe(true)
    expect(containsNul('plain \\0 text')).toBe(false)
    expect(containsNul('')).toBe(false)
  })
})
