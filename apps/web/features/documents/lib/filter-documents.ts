import type { DocumentSummary } from '@kb/contracts'

import { DEFAULT_LOCALE } from '@/core/config/locale'
import type { DocumentsFilter } from '@/features/documents/types'

const COMBINING_MARKS = /\p{M}/gu

/** Folds case and accents so `cafe` finds `Café`. */
function toSearchText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLocaleLowerCase(DEFAULT_LOCALE)
}

/**
 * Documents whose title contains the search text and that carry any of the selected tags. An empty
 * search or an empty tag selection does not narrow the list.
 */
export function filterDocuments<TDocument extends Pick<DocumentSummary, 'title' | 'tags'>>(
  documents: readonly TDocument[],
  { search, tags }: DocumentsFilter
): TDocument[] {
  const query = toSearchText(search.trim())
  const selected = new Set(tags)
  const matchesSearch = (title: string) => query === '' || toSearchText(title).includes(query)
  const matchesTags = (documentTags: readonly string[]) =>
    selected.size === 0 || documentTags.some((tag) => selected.has(tag))
  return documents.filter((document) => matchesSearch(document.title) && matchesTags(document.tags))
}

export function isFilterActive({ search, tags }: DocumentsFilter): boolean {
  return search.trim() !== '' || tags.length > 0
}
