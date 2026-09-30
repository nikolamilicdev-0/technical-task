import { describe, expect, it } from 'vitest'

import { parseCitations } from '../../../../src/modules/chat/citation-parser.js'

const SOURCES = 6

describe('parseCitations', () => {
  it.each([
    ['one marker', 'Plans renew monthly [1].', [1]],
    ['adjacent markers', 'It costs 20 euros [1][3].', [1, 3]],
    ['a list in one marker', 'Both apply [1, 2] and [4,5].', [1, 2, 4, 5]],
    ['padding inside the brackets', 'See [ 2 ,3 ].', [2, 3]],
    ['a marker glued to a word', 'Annual billing[2] saves money.', [2]],
    ['repeats, sorted and deduplicated', 'A [3]. B [1]. C [3][1].', [1, 3]],
    ['no markers', 'Your documents do not cover this.', []],
  ])('reads %s', (_, text, cited) => {
    expect(parseCitations(text, SOURCES)).toEqual(cited)
  })

  it('ignores numbers no source has', () => {
    expect(parseCitations('Real [2], invented [0], [7] and [12].', SOURCES)).toEqual([2])
    expect(parseCitations('Anything [1].', 0)).toEqual([])
  })

  it('ignores Markdown links and link definitions', () => {
    const text = 'See [1](https://example.com) and\n[2]: https://example.com\nbut cite [3].'

    expect(parseCitations(text, SOURCES)).toEqual([3])
  })

  it('ignores indexing inside inline code and fenced code blocks', () => {
    const text = [
      'Read `items[1]` first [2].',
      '```ts',
      'const second = items[3]',
      '```',
      'Then [4].',
    ].join('\n')

    expect(parseCitations(text, SOURCES)).toEqual([2, 4])
  })

  it('treats an unclosed fence as code to the end', () => {
    expect(parseCitations('Intro [1].\n```\nmatrix[2][3]', SOURCES)).toEqual([1])
  })

  it('reads nothing from brackets that hold no number', () => {
    expect(parseCitations('[a] [1a] [] [1,] [-1]', SOURCES)).toEqual([])
  })
})
