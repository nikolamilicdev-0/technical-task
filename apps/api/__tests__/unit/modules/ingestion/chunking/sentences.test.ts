import { describe, expect, it } from 'vitest'

import {
  splitKeepingSeparators,
  splitSentences,
} from '../../../../../src/modules/ingestion/chunking/sentences.js'

const texts = (text: string): string[] => splitSentences(text).map((piece) => piece.text)
const rejoin = (text: string): string =>
  splitSentences(text)
    .map((piece) => piece.separator + piece.text)
    .join('')

describe('splitSentences', () => {
  it('splits after sentence-final punctuation', () => {
    expect(texts('One. Two! Three? Four… Five.')).toEqual([
      'One.',
      'Two!',
      'Three?',
      'Four…',
      'Five.',
    ])
  })

  it('keeps closing quotes and brackets with their sentence', () => {
    expect(texts('He said "stop." Then (quietly.) he left.')).toEqual([
      'He said "stop."',
      'Then (quietly.)',
      'he left.',
    ])
  })

  it('does not split inside numbers or at punctuation without whitespace', () => {
    expect(texts('It costs 3.50 today.It works.')).toEqual(['It costs 3.50 today.It works.'])
  })

  it('splits at line breaks, so list items and table rows stay whole', () => {
    expect(texts('- first item\n- second item\n| a | b |')).toEqual([
      '- first item',
      '- second item',
      '| a | b |',
    ])
  })

  it('keeps each separator so that the pieces join back into the text', () => {
    const text = 'First.  Second?\n  - item\nThird.'

    expect(rejoin(text)).toBe(text)
    expect(splitSentences(text).map((piece) => piece.separator)).toEqual(['', '  ', '\n  ', '\n'])
  })
})

describe('splitKeepingSeparators', () => {
  it('drops empty pieces around a leading or trailing boundary', () => {
    expect(splitKeepingSeparators(',a,b,', /(,)/)).toEqual([
      { text: 'a', separator: ',' },
      { text: 'b', separator: ',' },
    ])
  })
})
