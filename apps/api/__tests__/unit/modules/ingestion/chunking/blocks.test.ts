import { describe, expect, it } from 'vitest'

import {
  splitBlocks,
  splitCodeLines,
} from '../../../../../src/modules/ingestion/chunking/blocks.js'

const lines = (...text: string[]): string => text.join('\n')

describe('splitBlocks', () => {
  it('splits prose on blank lines', () => {
    expect(splitBlocks(lines('One.', 'Still one.', '', 'Two.', '', '', 'Three.'))).toEqual([
      { kind: 'prose', text: lines('One.', 'Still one.') },
      { kind: 'prose', text: 'Two.' },
      { kind: 'prose', text: 'Three.' },
    ])
  })

  it('keeps a fenced code block whole, blank lines included', () => {
    const code = lines('```ts', 'const a = 1', '', 'const b = 2', '```')

    expect(splitBlocks(lines('Intro.', '', code, '', 'Outro.'))).toEqual([
      { kind: 'prose', text: 'Intro.' },
      { kind: 'code', text: code },
      { kind: 'prose', text: 'Outro.' },
    ])
  })

  it('separates a fence that directly follows or precedes prose', () => {
    expect(splitBlocks(lines('Run:', '```', 'make', '```', 'Done.'))).toEqual([
      { kind: 'prose', text: 'Run:' },
      { kind: 'code', text: lines('```', 'make', '```') },
      { kind: 'prose', text: 'Done.' },
    ])
  })

  it('runs an unclosed fence to the end as code', () => {
    expect(splitBlocks(lines('```', 'a', '', 'b'))).toEqual([
      { kind: 'code', text: lines('```', 'a', '', 'b') },
    ])
  })
})

describe('splitCodeLines', () => {
  it('splits code into lines whose separators keep blank lines', () => {
    const code = lines('```py', 'a = 1', '', '', 'b = 2', '```')
    const pieces = splitCodeLines(code)

    expect(pieces.map((piece) => piece.text)).toEqual(['```py', 'a = 1', 'b = 2', '```'])
    expect(pieces.map((piece) => piece.separator)).toEqual(['', '\n', '\n\n\n', '\n'])
    expect(pieces.map((piece) => piece.separator + piece.text).join('')).toBe(code)
  })
})
