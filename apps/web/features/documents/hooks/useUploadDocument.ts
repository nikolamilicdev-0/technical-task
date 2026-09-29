import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'

import { documentsKeys } from '@/features/documents/lib/documents-keys'
import { documentsService } from '@/features/documents/services/documents-service'

/** Uploads one file with progress; the lists refetch afterwards, so polling picks the new one up. */
export function useUploadDocument() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const mutation = useMutation({
    mutationFn: (file: File) => {
      const controller = new AbortController()
      controllerRef.current = controller
      setProgress(0)
      return documentsService.upload(file, { signal: controller.signal, onProgress: setProgress })
    },
    onSuccess: (document) => queryClient.setQueryData(documentsKeys.detail(document.id), document),
    // Aborted uploads refetch too: the server may have received the whole file before the cancel.
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentsKeys.lists() }),
  })

  const cancel = useCallback(() => controllerRef.current?.abort(), [])

  return { ...mutation, progress, cancel }
}
