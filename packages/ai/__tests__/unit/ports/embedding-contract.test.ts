import { describe, expect, it } from 'vitest'

import {
  findEmbeddingInputProblem,
  toEmbeddingSignature,
} from '../../../src/ports/embedding-contract.js'

describe('toEmbeddingSignature', () => {
  it('is the bare model name without configured dimensions', () => {
    expect(toEmbeddingSignature('nomic-embed-text', undefined)).toBe('nomic-embed-text')
  })

  it('appends configured dimensions', () => {
    expect(toEmbeddingSignature('text-embedding-3-small', 512)).toBe('text-embedding-3-small#512')
  })
})

describe('findEmbeddingInputProblem', () => {
  it('accepts non-empty texts', () => {
    expect(findEmbeddingInputProblem(['alpha', ' '])).toBeUndefined()
  })

  it.each([
    ['no texts', []],
    ['an empty text', ['alpha', '']],
  ])('rejects %s', (_, texts) => {
    expect(findEmbeddingInputProblem(texts)).toEqual(expect.any(String))
  })
})
