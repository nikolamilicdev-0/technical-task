import type { Conversation } from '@kb/contracts'
import { z } from 'zod'

import { timestampColumn } from '../../database/column-schemas.js'
import type { ConversationRow } from './chat.types.js'

const conversationRowSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  created_at: timestampColumn,
  updated_at: timestampColumn,
})

export function toConversation(row: ConversationRow): Conversation {
  const parsed = conversationRowSchema.parse(row)
  return {
    id: parsed.id,
    title: parsed.title,
    createdAt: parsed.created_at,
    updatedAt: parsed.updated_at,
  }
}
