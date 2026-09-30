import { DEFAULT_LOCALE } from '@/core/config/locale'

type DateInput = string | Date

const MS_PER_SECOND = 1_000
const JUST_NOW_MS = 60_000

// Largest unit first; a month and a year use their average length in seconds.
const RELATIVE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['year', 31_557_600],
  ['month', 2_629_800],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
]

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDateTime(
  value: DateInput,
  locale = DEFAULT_LOCALE,
  timeZone?: string
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(toDate(value))
}

export function formatDateRange(from: DateInput, to: DateInput, locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).formatRange(
    toDate(from),
    toDate(to)
  )
}

/** Read and formatted in UTC, so a `YYYY-MM-DD` bucket never shifts a day. */
export function formatDay(day: string, locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))
}

export function formatRelativeTime(
  value: DateInput,
  now: Date = new Date(),
  locale = DEFAULT_LOCALE
): string {
  const seconds = Math.round((toDate(value).getTime() - now.getTime()) / MS_PER_SECOND)
  const [unit, size] = RELATIVE_UNITS.find(
    ([, unitSeconds]) => Math.abs(seconds) >= unitSeconds
  ) ?? ['second', 1]
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    Math.round(seconds / size),
    unit
  )
}

/** The last minute reads as `justNow`, and so does a clock running slightly ahead. */
export function formatRecentTime(
  value: string,
  now: number,
  justNow: string,
  locale = DEFAULT_LOCALE
): string {
  if (now - Date.parse(value) < JUST_NOW_MS) return justNow
  return formatRelativeTime(value, new Date(now), locale)
}
