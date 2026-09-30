export type SearchParamValue = string | string[] | undefined

export type SearchParams = Record<string, SearchParamValue>

export function pickString(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
