import { useQuery } from '@tanstack/react-query'

import { DOCUMENTS_LIST_PARAMS } from '@/features/documents/constants'
import { documentsKeys } from '@/features/documents/lib/documents-keys'
import { getIndexingRefetchInterval } from '@/features/documents/lib/get-refetch-interval'
import { documentsService } from '@/features/documents/services/documents-service'

export function useDocuments() {
  return useQuery({
    queryKey: documentsKeys.list(DOCUMENTS_LIST_PARAMS),
    queryFn: ({ signal }) => documentsService.list(DOCUMENTS_LIST_PARAMS, signal),
    refetchInterval: (query) =>
      getIndexingRefetchInterval(query.state.data?.items, query.state.status),
  })
}
