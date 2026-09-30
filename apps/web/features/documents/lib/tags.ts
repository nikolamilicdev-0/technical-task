import { MAX_TAGS, TAG_MAX_LENGTH } from '@kb/contracts'

import { DEFAULT_LOCALE } from '@/core/config/locale'

const TAG_SEPARATORS = /[,\n]/
const WHITESPACE_RUN = /\s+/g

export function normalizeTag(raw: string): string {
  return raw.trim().replace(WHITESPACE_RUN, ' ')
}

function isSameTag(left: string, right: string): boolean {
  return left.toLocaleLowerCase(DEFAULT_LOCALE) === right.toLocaleLowerCase(DEFAULT_LOCALE)
}

/** Skips blank, over-long and case-insensitive duplicate tags, and stops at MAX_TAGS. */
export function addTags(current: readonly string[], input: string): string[] {
  const next = [...current]
  for (const tag of input.split(TAG_SEPARATORS).map(normalizeTag)) {
    if (next.length >= MAX_TAGS) break
    const invalid = tag === '' || tag.length > TAG_MAX_LENGTH
    if (!invalid && !next.some((existing) => isSameTag(existing, tag))) next.push(tag)
  }
  return next
}

export function removeTag(current: readonly string[], tag: string): string[] {
  return current.filter((existing) => existing !== tag)
}

export function hasRoomForTags(current: readonly string[]): boolean {
  return current.length < MAX_TAGS
}

export function haveSameTags(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((tag, index) => tag === right[index])
}

export function toggleTag(selected: readonly string[], tag: string, checked: boolean): string[] {
  const others = selected.filter((existing) => existing !== tag)
  return checked ? [...others, tag] : others
}
