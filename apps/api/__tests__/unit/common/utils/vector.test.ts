import { describe, expect, it } from 'vitest'

import { toStoredVector, VectorDimensionError } from '../../../../src/common/utils/vector.js'
import { VECTOR_DIMENSIONS } from '../../../../src/database/database.constants.js'

function parseLiteral(literal: string): number[] {
  return literal.slice(1, -1).split(',').map(Number)
}

describe('toStoredVector', () => {
  it('formats the pgvector text literal', () => {
    expect(toStoredVector([0.1, -0.25, 1e-7, 3], 4)).toBe('[0.1,-0.25,1e-7,3]')
  })

  it('zero-pads a smaller embedding to the column size', () => {
    expect(toStoredVector([0.5, 0.5], 4)).toBe('[0.5,0.5,0,0]')

    const stored = parseLiteral(toStoredVector(new Array<number>(768).fill(0.1)))
    expect(stored).toHaveLength(VECTOR_DIMENSIONS)
    expect(stored.slice(768).every((value) => value === 0)).toBe(true)
  })

  it('passes an embedding of exactly the column size through unchanged', () => {
    const embedding = Array.from({ length: VECTOR_DIMENSIONS }, (_, index) => index / 1000)
    expect(parseLiteral(toStoredVector(embedding))).toEqual(embedding)
  })

  it('rejects an embedding larger than the column, naming the setting to change', () => {
    expect(() => toStoredVector([1, 2, 3], 2)).toThrow(/3 dimensions.*AI_EMBEDDING_DIMENSIONS/)
    expect(() => toStoredVector([1, 2, 3], 2)).toThrow(VectorDimensionError)
  })

  it('rejects an empty embedding as a dimension problem', () => {
    expect(() => toStoredVector([], 4)).toThrow(VectorDimensionError)
  })

  it.each([[[0.1, Number.NaN]], [[Number.POSITIVE_INFINITY]]])(
    'rejects the non-finite embedding %o, which is no dimension problem',
    (embedding) => {
      expect(() => toStoredVector(embedding, 4)).toThrow(RangeError)
      expect(() => toStoredVector(embedding, 4)).not.toThrow(VectorDimensionError)
    }
  )
})
