import type { DocumentSummary } from '@kb/contracts'

import { DEFAULT_LOCALE } from '@/core/config/locale'

// Numeric collation sorts `q2` before `q10`.
const tagCollator = new Intl.Collator(DEFAULT_LOCALE, { numeric: true })

/** Every tag used across the documents, once each, in alphabetical order. */
export function collectTags(documents: readonly Pick<DocumentSummary, 'tags'>[]): string[] {
  return [...new Set(documents.flatMap((document) => document.tags))].sort(tagCollator.compare)
}
