import type { DocumentsListParams } from '@/features/documents/types'

/** React Query keys: invalidating `lists()` or `details()` covers every list or document. */
export const documentsKeys = {
  all: ['documents'] as const,
  lists: () => [...documentsKeys.all, 'list'] as const,
  list: (params: DocumentsListParams) => [...documentsKeys.lists(), params] as const,
  details: () => [...documentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentsKeys.details(), id] as const,
}
