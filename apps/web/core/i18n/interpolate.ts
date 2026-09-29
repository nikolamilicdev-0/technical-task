import { DEFAULT_LOCALE } from '@/core/config/locale'
import { formatNumber } from '@/core/utils/format-number'

export type InterpolationValues = Readonly<Record<string, string | number>>

/** Dictionary entry with CLDR plural forms, e.g. `{ "one": "{count} file", "other": "{count} files" }`. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g

/** Fills `{name}` placeholders; unknown ones stay visible so missing values are easy to spot. */
export function interpolate(template: string, values: InterpolationValues): string {
  return template.replace(PLACEHOLDER_PATTERN, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder
  )
}

/** Picks the plural form for `count` and fills `{count}` (locale-formatted) plus any other values. */
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
