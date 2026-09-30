import {
  citationSchema,
  finishReasonSchema,
  type Message,
  messageRoleSchema,
  type MessageUsage,
} from '@kb/contracts'
import { z } from 'zod'

import { countColumn, timestampColumn } from '../../database/column-schemas.js'
import type { AnswerRecord, MessageInsertRow, MessageRow } from './chat.types.js'

// Parsing checks the jsonb citation snapshot against the contract it was written with (DEC-009).
const messageRowSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  citations: z.array(citationSchema),
  model: z.string().nullable(),
  finish_reason: finishReasonSchema.nullable(),
  prompt_tokens: countColumn.nullable(),
  completion_tokens: countColumn.nullable(),
  usage_estimated: z.boolean(),
  created_at: timestampColumn,
})
type ParsedMessageRow = z.output<typeof messageRowSchema>

export function toMessage(row: MessageRow): Message {
  const parsed = messageRowSchema.parse(row)
  const usage = toMessageUsage(parsed)
  return {
    id: parsed.id,
    conversationId: parsed.conversation_id,
    role: parsed.role,
    content: parsed.content,
    citations: parsed.citations,
    ...(parsed.model === null ? {} : { model: parsed.model }),
    ...(parsed.finish_reason === null ? {} : { finishReason: parsed.finish_reason }),
    ...(usage === undefined ? {} : { usage }),
    createdAt: parsed.created_at,
  }
}

export function toQuestionInsert(conversationId: string, content: string): MessageInsertRow {
  return { conversation_id: conversationId, role: 'user', content }
}

export function toAnswerInsert(answer: AnswerRecord): MessageInsertRow {
  return {
    conversation_id: answer.conversationId,
    role: 'assistant',
    content: answer.content,
    citations: [...answer.citations],
    metadata: answer.metadata,
    provider: answer.provider,
    model: answer.model,
    finish_reason: answer.finishReason,
    prompt_tokens: answer.usage.promptTokens,
    completion_tokens: answer.usage.completionTokens,
    usage_estimated: answer.usage.estimated,
  }
}

function toMessageUsage(row: ParsedMessageRow): MessageUsage | undefined {
  const { prompt_tokens: promptTokens, completion_tokens: completionTokens } = row
  if (promptTokens === null || completionTokens === null) return undefined
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimated: row.usage_estimated,
  }
}
