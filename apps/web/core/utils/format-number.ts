import { DEFAULT_LOCALE } from '@/core/config/locale'

const COMPACT_FRACTION_DIGITS = 1

export function formatNumber(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value)
}

/** Short form for large counts, e.g. `12.5K` tokens. */
export function formatCompactNumber(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: COMPACT_FRACTION_DIGITS,
  }).format(value)
}

/** A 0–1 ratio as a whole percentage, e.g. a retrieval score of 0.873 → `87%`. */
export function formatPercent(ratio: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(ratio)
}

const BYTES_PER_KIBIBYTE = 1_024
const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const

/** A file size in binary steps, e.g. `512 bytes`, `12.3 kB`, `10 MB`. */
export function formatBytes(bytes: number, locale: string = DEFAULT_LOCALE): string {
  const exponent = Math.min(
    Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(BYTES_PER_KIBIBYTE)),
    BYTE_UNITS.length - 1
  )
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: BYTE_UNITS[exponent],
    // The short form of a plain byte count reads `512 byte`, so bytes spell the unit out.
    unitDisplay: exponent === 0 ? 'long' : 'short',
    maximumFractionDigits: COMPACT_FRACTION_DIGITS,
  }).format(bytes / BYTES_PER_KIBIBYTE ** exponent)
}
