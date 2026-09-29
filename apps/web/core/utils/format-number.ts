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
