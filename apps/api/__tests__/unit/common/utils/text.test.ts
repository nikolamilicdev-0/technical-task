import { describe, expect, it } from 'vitest'

import {
  countCodePoints,
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
