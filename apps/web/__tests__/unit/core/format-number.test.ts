import { describe, expect, it } from 'vitest'

import { formatBytes, formatNumber, formatPercent } from '@/core/utils/format-number'

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1_234_567)).toBe('1,234,567')
    expect(formatNumber(0.5)).toBe('0.5')
  })

  it('respects the locale', () => {
    expect(formatNumber(1_234.5, 'de-DE')).toBe('1.234,5')
  })
})

describe('formatPercent', () => {
  it.each([
    [0, '0%'],
    [0.873, '87%'],
    [1, '100%'],
  ])('shows %d as %s', (ratio, expected) => {
    expect(formatPercent(ratio)).toBe(expected)
  })
})

describe('formatBytes', () => {
  it.each([
    [0, '0 bytes'],
    [1, '1 byte'],
    [512, '512 bytes'],
    [12_646, '12.3 kB'],
    [10 * 1_024 * 1_024, '10 MB'],
    [3 * 1_024 ** 4, '3,072 GB'],
  ])('shows %d bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})
