import { describe, expect, it } from 'vitest'

import { toArrayLiteral, toContainsPattern } from '../../../src/database/postgrest-filters.js'

describe('toContainsPattern', () => {
  it('matches the text anywhere in the value', () => {
    expect(toContainsPattern('release')).toBe('%release%')
  })

  it.each([
    ['a percent sign', '50% off', '%50\\% off%'],
    ['an underscore', 'snake_case', '%snake\\_case%'],
    ['a backslash', 'C:\\docs', '%C:\\\\docs%'],
  ])('escapes %s so it matches literally', (_, text, pattern) => {
    expect(toContainsPattern(text)).toBe(pattern)
  })

  it('turns `*` into a one-character wildcard, since PostgREST would widen it to `%`', () => {
    expect(toContainsPattern('C*')).toBe('%C_%')
  })
})

describe('toArrayLiteral', () => {
  it('quotes every element', () => {
    expect(toArrayLiteral(['release', 'q3'])).toBe('{"release","q3"}')
  })

  it.each([
    ['a comma', 'a,b', '{"a,b"}'],
    ['braces', '{draft}', '{"{draft}"}'],
    ['a double quote', 'say "hi"', '{"say \\"hi\\""}'],
    ['a backslash', 'C:\\docs', '{"C:\\\\docs"}'],
  ])('keeps an element with %s as one element', (_, tag, literal) => {
    expect(toArrayLiteral([tag])).toBe(literal)
  })
})
