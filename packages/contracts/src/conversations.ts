import { z } from 'zod'

import { idSchema, paginatedSchema, paginationQuerySchema, timestampSchema } from './common.js'
import { CONVERSATION_TITLE_MAX } from './limits.js'
import { messageSchema } from './messages.js'

export const conversationTitleSchema = z.string().trim().min(1).max(CONVERSATION_TITLE_MAX)

export const conversationSchema = z.object({
  id: idSchema,
  title: z.string().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})
export type Conversation = z.infer<typeof conversationSchema>

export const createConversationSchema = z.object({ title: conversationTitleSchema.optional() })
export type CreateConversationInput = z.infer<typeof createConversationSchema>

export const updateConversationSchema = z.object({ title: conversationTitleSchema })
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>

export const listConversationsQuerySchema = paginationQuerySchema
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>

export const conversationListSchema = paginatedSchema(conversationSchema)
export type ConversationList = z.infer<typeof conversationListSchema>

export const conversationDetailSchema = z.object({
  conversation: conversationSchema,
  messages: z.array(messageSchema),
})
export type ConversationDetail = z.infer<typeof conversationDetailSchema>
