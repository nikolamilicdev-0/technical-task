import type {
  ConversationDetail,
  ConversationList,
  CreateConversationInput,
  UpdateConversationInput,
} from '@kb/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { getErrorMessage } from '@/core/api/get-error-message'
import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { useActiveConversationId } from '@/features/chat/hooks/useActiveConversationId'
import { getChatStrings } from '@/features/chat/lib/chat-strings'
import {
  prependConversation,
  removeConversation,
  replaceConversation,
} from '@/features/chat/lib/conversation-cache'
import { conversationsKeys } from '@/features/chat/lib/conversations-keys'
import { conversationsService } from '@/features/chat/services/conversations-service'

interface RenameVariables {
  id: string
  input: UpdateConversationInput
}

/** Cached as empty and listed first at once, so thread and sidebar show it before the answer. */
export function useCreateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateConversationInput) => conversationsService.create(input),
    onSuccess: (conversation) => {
      const detail: ConversationDetail = { conversation, messages: [] }
      queryClient.setQueryData(conversationsKeys.detail(conversation.id), detail)
      queryClient.setQueriesData<ConversationList>(
        { queryKey: conversationsKeys.lists() },
        (list) => list && prependConversation(list, conversation)
      )
      void queryClient.invalidateQueries({ queryKey: conversationsKeys.lists() })
    },
  })
}

export function useRenameConversation() {
  const queryClient = useQueryClient()
  const strings = getChatStrings(useT())
  return useMutation({
    mutationFn: ({ id, input }: RenameVariables) => conversationsService.rename(id, input),
    onSuccess: (conversation) => {
      queryClient.setQueriesData<ConversationList>(
        { queryKey: conversationsKeys.lists() },
        (list) => list && replaceConversation(list, conversation)
      )
      queryClient.setQueryData<ConversationDetail>(
        conversationsKeys.detail(conversation.id),
        (detail) => detail && { ...detail, conversation }
      )
      toast.success(strings.rename.renamed)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: conversationsKeys.lists() }),
  })
}

/** Deleting the open conversation starts a new chat first, so nothing refetches what is gone. */
export function useDeleteConversation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const activeId = useActiveConversationId()
  const t = useT()
  const strings = getChatStrings(t)
  return useMutation({
    mutationFn: (id: string) => conversationsService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: conversationsKeys.lists() })
      const previousLists = queryClient.getQueriesData<ConversationList>({
        queryKey: conversationsKeys.lists(),
      })
      queryClient.setQueriesData<ConversationList>(
        { queryKey: conversationsKeys.lists() },
        (list) => list && removeConversation(list, id)
      )
      if (id === activeId) router.replace(routes.chat.index)
      return { previousLists }
    },
    onError: (error, _id, snapshot) => {
      snapshot?.previousLists.forEach(([key, list]) => queryClient.setQueryData(key, list))
      toast.error(getErrorMessage(error, t.errors))
    },
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: conversationsKeys.detail(id) })
      toast.success(strings.delete.deleted)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: conversationsKeys.lists() }),
  })
}
