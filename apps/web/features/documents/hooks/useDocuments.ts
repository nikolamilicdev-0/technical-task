import { useQuery } from '@tanstack/react-query'

import { DOCUMENTS_LIST_PARAMS } from '@/features/documents/constants'
import { documentsKeys } from '@/features/documents/lib/documents-keys'
import { getIndexingRefetchInterval } from '@/features/documents/lib/get-refetch-interval'
import { documentsService } from '@/features/documents/services/documents-service'

/** The most recently updated documents; polls while any of them is still being indexed. */
export function useDocuments() {
  return useQuery({
    queryKey: documentsKeys.list(DOCUMENTS_LIST_PARAMS),
    queryFn: ({ signal }) => documentsService.list(DOCUMENTS_LIST_PARAMS, signal),
    refetchInterval: (query) => getIndexingRefetchInterval(query.state.data?.items),
  })
}
