import { describe, expect, it } from 'vitest'

import { fuseRankings } from '../../../../src/modules/retrieval/rank-fusion.js'
import { buildCandidate } from '../../../fixtures/chat.js'

const K = 60
const OPTIONS = { k: K, limit: 10 }

const vector = (key: string, similarity: number) => buildCandidate(key, { similarity })
const keyword = (key: string, keywordRank: number) => buildCandidate(key, { keywordRank })
const ids = (chunks: readonly { chunkId: string }[]) => chunks.map(({ chunkId }) => chunkId)

describe('fuseRankings', () => {
  it('scores each chunk Σ 1 / (k + rank) with 1-based ranks', () => {
    const fused = fuseRankings(
      [
        [vector('a', 0.9), vector('b', 0.8)],
        [keyword('b', 0.5), keyword('c', 0.4)],
      ],
      OPTIONS
    )

    expect(fused.map(({ chunkId, fusedScore }) => [chunkId, fusedScore])).toEqual([
      ['chunk-b', 1 / (K + 2) + 1 / (K + 1)],
      ['chunk-a', 1 / (K + 1)],
      ['chunk-c', 1 / (K + 2)],
    ])
  })

  it('ranks a chunk both lists found above one that tops a single list', () => {
    const fused = fuseRankings(
      [
        [vector('solo', 0.95), vector('both', 0.7)],
        [keyword('other', 0.9), keyword('both', 0.8)],
      ],
      OPTIONS
    )

    expect(ids(fused)[0]).toBe('chunk-both')
  })

  it('keeps each list rank and both scores for diagnostics', () => {
    const [both, keywordOnly, vectorOnly] = fuseRankings(
      [
        [vector('both', 0.7), vector('v', 0.6)],
        [keyword('k', 0.9), keyword('both', 0.8)],
      ],
      OPTIONS
    )

    expect(both).toMatchObject({ ranks: [1, 2], similarity: 0.7, keywordRank: 0.8 })
    expect(keywordOnly).toMatchObject({ chunkId: 'chunk-k', ranks: [null, 1], keywordRank: 0.9 })
    expect(vectorOnly).toMatchObject({ chunkId: 'chunk-v', ranks: [2, null], similarity: 0.6 })
  })

  it('breaks score ties by vector similarity, then by chunk id', () => {
    const fused = fuseRankings(
      [
        [vector('x', 0.5), vector('y', 0.4)],
        [keyword('y', 0.3), keyword('x', 0.2), keyword('c', 0.1)],
        [keyword('a', 0.1), keyword('z', 0.1), keyword('b', 0.1)],
      ],
      OPTIONS
    )

    // x and y tie at 1/61 + 1/62 and x is more similar; c and b tie at 1/63 without similarity.
    expect(ids(fused)).toEqual(['chunk-x', 'chunk-y', 'chunk-a', 'chunk-z', 'chunk-b', 'chunk-c'])
  })

  it('keeps only the best `limit` chunks', () => {
    const list = ['a', 'b', 'c', 'd'].map((key, index) => vector(key, 1 - index / 10))

    expect(ids(fuseRankings([list], { k: K, limit: 2 }))).toEqual(['chunk-a', 'chunk-b'])
  })

  it('returns nothing for empty lists and follows the one list that has hits', () => {
    expect(fuseRankings([], OPTIONS)).toEqual([])
    expect(fuseRankings([[], []], OPTIONS)).toEqual([])
    expect(ids(fuseRankings([[], [keyword('k', 0.1)]], OPTIONS))).toEqual(['chunk-k'])
  })

  it('counts a chunk listed twice once, at its better position', () => {
    const [chunk] = fuseRankings([[vector('a', 0.9), vector('a', 0.9)]], OPTIONS)

    expect(chunk).toMatchObject({ fusedScore: 1 / (K + 1), ranks: [1] })
  })

  it('lets a small k favour a top rank and a large k favour agreement', () => {
    const lists = [
      [vector('top', 0.9), vector('v2', 0.8), vector('v3', 0.7), vector('agreed', 0.6)],
      [keyword('k1', 0.9), keyword('k2', 0.8), keyword('k3', 0.7), keyword('agreed', 0.6)],
    ]

    expect(ids(fuseRankings(lists, { k: 1, limit: 1 }))).toEqual(['chunk-top'])
    expect(ids(fuseRankings(lists, { k: 60, limit: 1 }))).toEqual(['chunk-agreed'])
  })

  it.each([
    [{ k: -1, limit: 1 }, 'k must be'],
    [{ k: Number.NaN, limit: 1 }, 'k must be'],
    [{ k: 60, limit: 0 }, 'limit must be'],
    [{ k: 60, limit: 1.5 }, 'limit must be'],
  ])('rejects %o', (options, message) => {
    expect(() => fuseRankings([], options)).toThrow(RangeError)
    expect(() => fuseRankings([], options)).toThrow(message)
  })
})
