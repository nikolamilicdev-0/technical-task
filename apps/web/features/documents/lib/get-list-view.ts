import type { DocumentsListView, ListViewInput } from '@/features/documents/types'

/** Loaded data wins over a failed refetch, so a polling error never blanks the list. */
export function getListView({ hasData, isError, loaded, shown }: ListViewInput): DocumentsListView {
  if (!hasData) return isError ? 'error' : 'loading'
  if (loaded === 0) return 'empty'
  return shown === 0 ? 'noMatches' : 'results'
}
