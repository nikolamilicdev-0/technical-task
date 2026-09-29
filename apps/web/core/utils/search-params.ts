export type SearchParamValue = string | string[] | undefined

export type SearchParams = Record<string, SearchParamValue>

/** First value of a query parameter that may repeat (`?tag=a&tag=b`). */
export function pickString(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
