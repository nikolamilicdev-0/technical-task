import { DEFAULT_LOCALE } from '@/core/config/locale'
import { formatNumber } from '@/core/utils/format-number'

export type InterpolationValues = Readonly<Record<string, string | number>>

/** CLDR plural forms, e.g. `{ "one": "{count} file", "other": "{count} files" }`. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g

/** Unknown placeholders stay visible, so a missing value is easy to spot. */
export function interpolate(template: string, values: InterpolationValues): string {
  return template.replace(PLACEHOLDER_PATTERN, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder
  )
}

export function pluralize(
  forms: PluralForms,
  count: number,
  values: InterpolationValues = {},
  locale: string = DEFAULT_LOCALE
): string {
  const category = new Intl.PluralRules(locale).select(count)
  const template = forms[category] ?? forms.other
  return interpolate(template, { ...values, count: formatNumber(count, locale) })
}
