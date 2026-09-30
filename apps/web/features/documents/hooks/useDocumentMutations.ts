import type { Document, DocumentList, UpdateDocumentInput } from '@kb/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { getErrorMessage } from '@/core/api/get-error-message'
import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import {
  applyDocumentUpdate,
  removeFromList,
  updateInList,
  withPendingStatus,
} from '@/features/documents/lib/document-cache'
import { documentsKeys } from '@/features/documents/lib/documents-keys'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import { documentsService } from '@/features/documents/services/documents-service'

export function useCreateDocument() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const strings = getDocumentsStrings(useT())
  return useMutation({
    mutationFn: documentsService.create,
    onSuccess: (document) => {
      queryClient.setQueryData(documentsKeys.detail(document.id), document)
      void queryClient.invalidateQueries({ queryKey: documentsKeys.lists() })
      toast.success(strings.create.created)
      // Replaced, so going back reaches the list rather than an empty "new document" form.
      router.replace(routes.documents.detail(document.id))
    },
  })
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient()
  const strings = getDocumentsStrings(useT())
  const detailKey = documentsKeys.detail(id)
  return useMutation({
    mutationFn: (input: UpdateDocumentInput) => documentsService.update(id, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<Document>(detailKey)
      if (previous) queryClient.setQueryData(detailKey, applyDocumentUpdate(previous, input))
      return { previous }
    },
    onError: (_error, _input, snapshot) => {
      if (snapshot?.previous) queryClient.setQueryData(detailKey, snapshot.previous)
    },
    onSuccess: (document) => {
      queryClient.setQueryData(detailKey, document)
      toast.success(strings.editor.saved)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentsKeys.lists() }),
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const t = useT()
  const strings = getDocumentsStrings(t)
  return useMutation({
    mutationFn: (id: string) => documentsService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: documentsKeys.lists() })
      const previousLists = queryClient.getQueriesData<DocumentList>({
        queryKey: documentsKeys.lists(),
      })
      queryClient.setQueriesData<DocumentList>(
        { queryKey: documentsKeys.lists() },
        (list) => list && removeFromList(list, id)
      )
      return { previousLists }
    },
    onError: (error, _id, snapshot) => {
      snapshot?.previousLists.forEach(([key, list]) => queryClient.setQueryData(key, list))
      toast.error(getErrorMessage(error, t.errors))
    },
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: documentsKeys.detail(id) })
      toast.success(strings.delete.deleted)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentsKeys.lists() }),
  })
}

export function useReindexDocument(id: string) {
  const queryClient = useQueryClient()
  const t = useT()
  const strings = getDocumentsStrings(t)
  const detailKey = documentsKeys.detail(id)
  return useMutation({
    mutationFn: () => documentsService.reindex(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: documentsKeys.all })
      const previous = queryClient.getQueryData<Document>(detailKey)
      const previousLists = queryClient.getQueriesData<DocumentList>({
        queryKey: documentsKeys.lists(),
      })
      if (previous) queryClient.setQueryData(detailKey, withPendingStatus(previous))
      queryClient.setQueriesData<DocumentList>(
        { queryKey: documentsKeys.lists() },
        (list) => list && updateInList(list, id, withPendingStatus)
      )
      return { previous, previousLists }
    },
    onError: (error, _variables, snapshot) => {
      if (snapshot?.previous) queryClient.setQueryData(detailKey, snapshot.previous)
      snapshot?.previousLists.forEach(([key, list]) => queryClient.setQueryData(key, list))
      toast.error(getErrorMessage(error, t.errors))
    },
    onSuccess: () => toast.success(strings.statusBar.reindexQueued),
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentsKeys.all }),
  })
}
