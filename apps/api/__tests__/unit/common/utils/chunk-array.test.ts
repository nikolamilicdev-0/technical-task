import { describe, expect, it } from 'vitest'

import { chunkArray } from '../../../../src/common/utils/chunk-array.js'

describe('chunkArray', () => {
  it('splits into consecutive batches, the last one shorter', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns one batch when everything fits and none for no items', () => {
    expect(chunkArray(['a', 'b'], 5)).toEqual([['a', 'b']])
    expect(chunkArray([], 3)).toEqual([])
  })

  it.each([0, -1, 1.5, Number.NaN])('rejects the batch size %o', (size) => {
    expect(() => chunkArray([1], size)).toThrow(RangeError)
  })
})
