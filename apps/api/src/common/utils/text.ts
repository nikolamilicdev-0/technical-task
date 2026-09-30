const HIGH_SURROGATE_MIN = 0xd800
const HIGH_SURROGATE_MAX = 0xdbff
const LOW_SURROGATE_MIN = 0xdc00
const LOW_SURROGATE_MAX = 0xdfff

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

/** True when `index` falls between the two halves of a surrogate pair. */
export function splitsSurrogatePair(text: string, index: number): boolean {
  const before = text.charCodeAt(index - 1)
  const after = text.charCodeAt(index)
  return (
    before >= HIGH_SURROGATE_MIN &&
    before <= HIGH_SURROGATE_MAX &&
    after >= LOW_SURROGATE_MIN &&
    after <= LOW_SURROGATE_MAX
  )
}

// Postgres `text` cannot store U+0000: a value holding one fails its request with a 500.
const NUL_CHARACTER = '\u0000'

/** True when the text holds U+0000, which no Postgres `text` column can store. */
export function containsNul(text: string): boolean {
  return text.includes(NUL_CHARACTER)
}
