import { MAX_SCOPE_DOCUMENTS } from '@kb/contracts'

export function toggleScope(selected: readonly string[], id: string, checked: boolean): string[] {
  if (!checked) return selected.filter((selectedId) => selectedId !== id)
  if (selected.includes(id) || selected.length >= MAX_SCOPE_DOCUMENTS) return [...selected]
  return [...selected, id]
}

// A picked document that was deleted or went back to indexing stops narrowing the answer, rather
// than leaving it nothing to search.
export function activeScope(selected: readonly string[], readyIds: ReadonlySet<string>): string[] {
  return selected.filter((id) => readyIds.has(id))
}

export function isScopeFull(selected: readonly string[]): boolean {
  return selected.length >= MAX_SCOPE_DOCUMENTS
}
