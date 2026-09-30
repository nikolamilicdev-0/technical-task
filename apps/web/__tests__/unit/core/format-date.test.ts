import { describe, expect, it } from 'vitest'

import {
  formatDateTime,
  formatDay,
  formatRecentTime,
  formatRelativeTime,
} from '@/core/utils/format-date'

// ICU separates the time and AM/PM with a narrow no-break space; compare plain spaces.
const normalizeSpaces = (value: string): string => value.replace(/\s/g, ' ')

describe('formatDateTime', () => {
  it('shows the day and a short time in the given time zone', () => {
    expect(normalizeSpaces(formatDateTime('2026-09-29T21:05:00Z', 'en', 'UTC'))).toBe(
      'Sep 29, 2026, 9:05 PM'
    )
    expect(normalizeSpaces(formatDateTime('2026-09-29T21:05:00Z', 'en', 'Asia/Tokyo'))).toBe(
      'Sep 30, 2026, 6:05 AM'
    )
  })
})

describe('formatDay', () => {
  it('reads YYYY-MM-DD buckets in UTC so they never shift a day', () => {
    expect(formatDay('2026-09-01')).toBe('Sep 1')
    expect(formatDay('2026-12-31')).toBe('Dec 31')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-09-29T12:00:00Z')

  it.each([
    ['2026-09-29T12:00:00Z', 'now'],
    ['2026-09-29T11:59:30Z', '30 seconds ago'],
    ['2026-09-29T11:59:00.400Z', '1 minute ago'],
    ['2026-09-29T11:55:00Z', '5 minutes ago'],
    ['2026-09-28T12:00:00Z', 'yesterday'],
    ['2026-09-26T12:00:00Z', '3 days ago'],
    ['2026-09-15T12:00:00Z', '2 weeks ago'],
    ['2026-09-29T14:00:00Z', 'in 2 hours'],
  ])('describes %s relative to noon', (value, expected) => {
    expect(formatRelativeTime(value, now)).toBe(expected)
  })
})

describe('formatRecentTime', () => {
  const now = Date.parse('2026-09-30T12:00:00.000Z')

  it('reads the last minute, and a clock running slightly ahead, as just now', () => {
    expect(formatRecentTime('2026-09-30T11:59:30.000Z', now, 'just now')).toBe('just now')
    expect(formatRecentTime('2026-09-30T12:00:05.000Z', now, 'just now')).toBe('just now')
  })

  it('describes older times relatively', () => {
    expect(formatRecentTime('2026-09-30T09:00:00.000Z', now, 'just now')).toBe('3 hours ago')
  })
})
