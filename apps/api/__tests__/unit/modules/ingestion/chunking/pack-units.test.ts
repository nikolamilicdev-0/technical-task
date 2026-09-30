import { describe, expect, it } from 'vitest'

import type {
  ChunkingOptions,
  ChunkUnit,
} from '../../../../../src/modules/ingestion/chunking/chunker.types.js'
import {
  joinUnits,
  packUnits,
  toChunkUnit,
} from '../../../../../src/modules/ingestion/chunking/pack-units.js'
import { TokenCounter } from '../../../../../src/ai/token-counter.js'
import { WordCounter } from '../../../../fakes/word-counter.js'

const counter = new WordCounter()
// With WordCounter every budget below is a number of words.
const OPTIONS: ChunkingOptions = {
  targetTokens: 6,
  maxTokens: 9,
  overlapTokens: 0,
  minTailTokens: 0,
}

function unit(text: string, separator = ' '): ChunkUnit {
  return toChunkUnit({ text, separator }, counter)
}

const pack = (texts: readonly string[], options: Partial<ChunkingOptions> = {}): string[] =>
  packUnits(
    texts.map((text) => unit(text)),
    { ...OPTIONS, ...options },
    counter
  )

describe('packUnits', () => {
  it('fills each chunk up to the target before starting the next', () => {
    expect(pack(['a b', 'c d', 'e f', 'g h'])).toEqual(['a b c d e f', 'g h'])
  })

  it('keeps a unit larger than the target whole, in a chunk of its own', () => {
    expect(pack(['a', 'b c d e f g h', 'i'])).toEqual(['a', 'b c d e f g h', 'i'])
  })

  it('opens the next chunk with the trailing units that fit in the overlap', () => {
    expect(pack(['a b', 'c d', 'e f', 'g h'], { overlapTokens: 2 })).toEqual([
      'a b c d e f',
      'e f g h',
    ])
  })

  it('never repeats a whole chunk as overlap', () => {
    expect(pack(['x', 'y', 'p q r s t'], { overlapTokens: 5 })).toEqual(['x y', 'y p q r s t'])
  })

  it('drops the overlap when it would push the next chunk past the target', () => {
    expect(pack(['a b', 'c d', 'e f g h i'], { overlapTokens: 2 })).toEqual([
      'a b c d',
      'e f g h i',
    ])
  })

  it('folds a tiny last chunk into the previous one when the result fits', () => {
    expect(pack(['a b c', 'd e f', 'g'], { minTailTokens: 3 })).toEqual(['a b c d e f g'])
  })

  it('keeps a tiny last chunk apart when folding it in would exceed the maximum', () => {
    expect(pack(['a b c', 'd e f', 'g'], { minTailTokens: 3, maxTokens: 6 })).toEqual([
      'a b c d e f',
      'g',
    ])
  })

  it('does not repeat the overlap when it folds a tiny last chunk in', () => {
    expect(
      pack(['a b c', 'd e', 'f'], { targetTokens: 5, overlapTokens: 2, minTailTokens: 2 })
    ).toEqual(['a b c d e f'])
  })

  it('returns no chunks for no units', () => {
    expect(pack([])).toEqual([])
  })
})

describe('toChunkUnit', () => {
  it('counts the tokens a separator adds in front of the unit', () => {
    const tokenCounter = new TokenCounter()

    expect(toChunkUnit({ text: 'Next sentence.', separator: ' ' }, tokenCounter)).toMatchObject({
      tokens: 3,
      joinTokens: 0,
    })
    expect(toChunkUnit({ text: 'Next block.', separator: '\n\n' }, tokenCounter)).toMatchObject({
      joinTokens: 1,
    })
    expect(toChunkUnit({ text: 'window', separator: '' }, tokenCounter).joinTokens).toBe(0)
  })
})

describe('joinUnits', () => {
  it('puts each unit’s own separator in front of it, except for the first', () => {
    expect(joinUnits([unit('a', '\n\n'), unit('b', '\n'), unit('c', ' ')])).toBe('a\nb c')
  })
})
