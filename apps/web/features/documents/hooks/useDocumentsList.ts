import type { DocumentSummary } from '@kb/contracts'
import { useState } from 'react'

import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { collectTags } from '@/features/documents/lib/collect-tags'
import { filterDocuments, isFilterActive } from '@/features/documents/lib/filter-documents'
import { getListView } from '@/features/documents/lib/get-list-view'

const NO_DOCUMENTS: readonly DocumentSummary[] = []

/** The documents page's data: the list query, the filter state and what to show for them. */
export function useDocumentsList() {
  const query = useDocuments()
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const documents = query.data?.items ?? NO_DOCUMENTS
  const tags = collectTags(documents)
  // A tag whose last document is gone stops filtering instead of hiding everything.
  const activeTags = selectedTags.filter((tag) => tags.includes(tag))
  const filter = { search, tags: activeTags }
  const visible = filterDocuments(documents, filter)
  const view = getListView({
    hasData: query.data !== undefined,
    isError: query.isError,
    loaded: documents.length,
    shown: visible.length,
  })

  const clearFilters = () => {
    setSearch('')
    setSelectedTags([])
  }

  return {
    view,
    error: query.error,
    retry: () => void query.refetch(),
    visible,
    loadedCount: documents.length,
    total: query.data?.total ?? 0,
    tags,
    search,
    setSearch,
    selectedTags: activeTags,
    setSelectedTags,
    filtering: isFilterActive(filter),
    clearFilters,
  }
}
