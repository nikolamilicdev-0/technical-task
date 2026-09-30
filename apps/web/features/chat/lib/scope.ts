import { MAX_SCOPE_DOCUMENTS } from '@kb/contracts'

/** Checks or unchecks a document; the API answers from at most `MAX_SCOPE_DOCUMENTS`. */
export function toggleScope(selected: readonly string[], id: string, checked: boolean): string[] {
  if (!checked) return selected.filter((selectedId) => selectedId !== id)
  if (selected.includes(id) || selected.length >= MAX_SCOPE_DOCUMENTS) return [...selected]
  return [...selected, id]
}

/**
 * The picked documents chat can still answer from: one deleted or back in the indexing queue
 * stops narrowing the answer instead of leaving it with nothing to search.
 */
export function activeScope(selected: readonly string[], readyIds: ReadonlySet<string>): string[] {
  return selected.filter((id) => readyIds.has(id))
}

export function isScopeFull(selected: readonly string[]): boolean {
  return selected.length >= MAX_SCOPE_DOCUMENTS
}
