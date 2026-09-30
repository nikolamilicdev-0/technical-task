import { useQuery } from '@tanstack/react-query'

import { documentsKeys } from '@/features/documents/lib/documents-keys'
import { getIndexingRefetchInterval } from '@/features/documents/lib/get-refetch-interval'
import { documentsService } from '@/features/documents/services/documents-service'

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentsKeys.detail(id),
    queryFn: ({ signal }) => documentsService.get(id, signal),
    refetchInterval: ({ state }) =>
      getIndexingRefetchInterval(state.data ? [state.data] : undefined, state.status),
  })
}
