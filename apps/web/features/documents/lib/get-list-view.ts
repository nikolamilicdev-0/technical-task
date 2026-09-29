import type { DocumentsListView, ListViewInput } from '@/features/documents/types'

/**
 * What the documents page shows. Loaded data wins over a failed background refetch, so a polling
 * error never blanks a list the user is looking at.
 */
export function getListView({ hasData, isError, loaded, shown }: ListViewInput): DocumentsListView {
  if (!hasData) return isError ? 'error' : 'loading'
  if (loaded === 0) return 'empty'
  return shown === 0 ? 'noMatches' : 'results'
}
