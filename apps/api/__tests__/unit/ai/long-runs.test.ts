import { describe, expect, it } from 'vitest'

import { MAX_ENCODED_RUN_LENGTH, sliceLongRuns } from '../../../src/ai/long-runs.js'
import { LONE_SURROGATE, LINEAR_TIME_BUDGET_MS, timed } from '../../fixtures/timing.js'

const RUNS = /\s+|\p{L}+|[^\s\p{L}\p{N}]+/gu
// A letter outside the Basic Multilingual Plane: one code point, two UTF-16 code units.
const ASTRAL_LETTER = '𠀀'

const longestRun = (text: string): number =>
  Math.max(0, ...[...text.matchAll(RUNS)].map((run) => run[0].length))

describe('sliceLongRuns', () => {
  it('leaves text whose runs fit whole', () => {
    const text = `Plain prose, ${'x'.repeat(MAX_ENCODED_RUN_LENGTH)} and ${'-'.repeat(20)} rules.`

    expect(sliceLongRuns(text)).toEqual([text])
  })

  it.each([
    ['spaces', ' '],
    ['letters', 'x'],
    ['CJK letters', '知'],
    ['replacement characters', '\uFFFD'],
  ])('cuts a long run of %s into slices that join back into the text', (_, character) => {
    const text = `start ${character.repeat(5 * MAX_ENCODED_RUN_LENGTH + 3)} end`

    const slices = sliceLongRuns(text)

    expect(slices).toHaveLength(6)
    expect(slices.join('')).toBe(text)
    expect(Math.max(...slices.map(longestRun))).toBeLessThanOrEqual(MAX_ENCODED_RUN_LENGTH)
  })

  it('treats runs of different classes separately', () => {
    const text = `${'a'.repeat(30)}${' '.repeat(30)}${'-'.repeat(30)}`

    expect(sliceLongRuns(text)).toEqual([text])
  })

  it('never cuts a surrogate pair in two', () => {
    // The leading letter puts every pair at an odd offset, where a plain cut would split it.
    const text = `a${ASTRAL_LETTER.repeat(3 * MAX_ENCODED_RUN_LENGTH)}`

    const slices = sliceLongRuns(text)

    expect(slices.length).toBeGreaterThan(1)
    expect(slices.join('')).toBe(text)
    expect(slices.some((slice) => LONE_SURROGATE.test(slice))).toBe(false)
  })

  it('slices a 400,000-character run in linear time', () => {
    const { value, ms } = timed(() => sliceLongRuns(' '.repeat(400_000)))

    expect(value.join('')).toHaveLength(400_000)
    expect(ms).toBeLessThan(LINEAR_TIME_BUDGET_MS)
  })
})
