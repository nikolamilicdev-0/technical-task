import { MAX_TAGS, TAG_MAX_LENGTH } from '@kb/contracts'

import { DEFAULT_LOCALE } from '@/core/config/locale'

const TAG_SEPARATORS = /[,\n]/
const WHITESPACE_RUN = /\s+/g

/** A tag as it is stored: trimmed, with inner whitespace collapsed to single spaces. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(WHITESPACE_RUN, ' ')
}

function isSameTag(left: string, right: string): boolean {
  return left.toLocaleLowerCase(DEFAULT_LOCALE) === right.toLocaleLowerCase(DEFAULT_LOCALE)
}

/**
 * Adds the comma- or line-separated tags in `input`. Blank, over-long and duplicate entries
 * (ignoring case) are skipped, and nothing is added beyond MAX_TAGS.
 */
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

/** The tag selection with `tag` checked or unchecked; other tags keep their order. */
export function toggleTag(selected: readonly string[], tag: string, checked: boolean): string[] {
  const others = selected.filter((existing) => existing !== tag)
  return checked ? [...others, tag] : others
}
