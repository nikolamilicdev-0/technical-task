const HIGH_SURROGATE_MIN = 0xd800
const HIGH_SURROGATE_MAX = 0xdbff

/** Length in Unicode code points, the unit of Postgres `char_length`. */
export function countCodePoints(text: string): number {
  let count = 0
  for (const _codePoint of text) count += 1
  return count
}

/** The first `count` code points, as Postgres `left(text, count)` returns them. */
export function takeCodePoints(text: string, count: number): string {
  let end = 0
  let taken = 0
  for (const codePoint of text) {
    if (taken === count) break
    end += codePoint.length
    taken += 1
  }
  return text.slice(0, end)
}

/** At most `maxLength` UTF-16 code units (what zod's string `max` counts), never half a pair. */
export function truncateUtf16(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const last = text.charCodeAt(maxLength - 1)
  const splitsPair = last >= HIGH_SURROGATE_MIN && last <= HIGH_SURROGATE_MAX
  return text.slice(0, splitsPair ? maxLength - 1 : maxLength)
}
