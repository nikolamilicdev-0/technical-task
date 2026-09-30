import { DEFAULT_LOCALE } from '@/core/config/locale'

const MAX_FRACTION_DIGITS = 1
const BYTES_PER_KIBIBYTE = 1_024
const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const

export function formatNumber(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatPercent(ratio: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(ratio)
}

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
    maximumFractionDigits: MAX_FRACTION_DIGITS,
  }).format(bytes / BYTES_PER_KIBIBYTE ** exponent)
}
