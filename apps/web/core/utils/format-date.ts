import { DEFAULT_LOCALE } from '@/core/config/locale'

type DateInput = string | Date

const MS_PER_SECOND = 1_000

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

/** `Sep 29, 2026`; pass a time zone to pin the calendar day (the default is the viewer's). */
export function formatDate(value: DateInput, locale = DEFAULT_LOCALE, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(toDate(value))
}

/** `Sep 29, 2026, 9:05 PM` */
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

/** A `YYYY-MM-DD` bucket (usage by day) read and formatted in UTC so it never shifts a day. */
export function formatDay(day: string, locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))
}

/** `5 minutes ago`, `yesterday`, `in 2 hours`, measured against `now`. */
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
