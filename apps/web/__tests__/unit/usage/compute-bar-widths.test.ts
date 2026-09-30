// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { computeBarWidths } from '@/features/usage/lib/compute-bar-widths'

describe('computeBarWidths', () => {
  it('leaves every bar empty when nothing is above zero, never NaN', () => {
    expect(computeBarWidths([0, 0, 0])).toEqual([0, 0, 0])
    expect(computeBarWidths([])).toEqual([])
  })

  it('sizes each bar against the largest value', () => {
    expect(computeBarWidths([50, 200, 100, 0])).toEqual([25, 100, 50, 0])
  })

  it('fills the bar of a single row', () => {
    expect(computeBarWidths([1_234])).toEqual([100])
  })

  it('gives values that are not positive numbers no bar', () => {
    const widths = computeBarWidths([-5, Number.NaN, Number.POSITIVE_INFINITY, 10])
    expect(widths).toEqual([0, 0, 0, 100])
  })
})
