import {
  apiRoutes,
  type Conversation,
  type ConversationDetail,
  conversationDetailSchema,
  type ConversationList,
  conversationListSchema,
  conversationSchema,
  type CreateConversationInput,
  type UpdateConversationInput,
} from '@kb/contracts'

import { getApiClient } from '@/core/api/browser-client'
import type { ConversationsListParams } from '@/features/chat/types'

export const conversationsService = {
  list: (query: ConversationsListParams, signal?: AbortSignal): Promise<ConversationList> =>
    getApiClient().request(apiRoutes.conversations.collection, {
      query,
      schema: conversationListSchema,
      signal,
    }),

  get: (id: string, signal?: AbortSignal): Promise<ConversationDetail> =>
    getApiClient().request(apiRoutes.conversations.item(id), {
      schema: conversationDetailSchema,
      signal,
    }),

  create: (input: CreateConversationInput): Promise<Conversation> =>
    getApiClient().request(apiRoutes.conversations.collection, {
      method: 'POST',
      body: input,
      schema: conversationSchema,
    }),

  rename: (id: string, input: UpdateConversationInput): Promise<Conversation> =>
    getApiClient().request(apiRoutes.conversations.item(id), {
      method: 'PATCH',
      body: input,
      schema: conversationSchema,
    }),

  remove: (id: string): Promise<void> =>
    getApiClient().request<void>(apiRoutes.conversations.item(id), { method: 'DELETE' }),
}
