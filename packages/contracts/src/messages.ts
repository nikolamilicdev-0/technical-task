import { z } from 'zod'

import { idSchema, timestampSchema, tokenCountSchema } from './common.js'

export const MESSAGE_ROLES = ['user', 'assistant'] as const
export const messageRoleSchema = z.enum(MESSAGE_ROLES)
export type MessageRole = z.infer<typeof messageRoleSchema>

export const FINISH_REASONS = [
  'stop',
  'length',
  'content_filter',
  'aborted',
  'error',
  'unknown',
] as const
export const finishReasonSchema = z.enum(FINISH_REASONS)
export type FinishReason = z.infer<typeof finishReasonSchema>

export const citationSchema = z.object({
  // 1-based position of the source in the prompt; `[n]` in the answer refers to citations[n - 1].
  index: z.number().int().positive(),
  documentId: idSchema,
  documentTitle: z.string(),
  chunkId: idSchema,
  chunkIndex: z.number().int().nonnegative(),
  headingPath: z.string(),
  excerpt: z.string(),
  score: z.number(),
  cited: z.boolean(),
})
export type Citation = z.infer<typeof citationSchema>

export const tokenUsageSchema = z.object({
  promptTokens: tokenCountSchema,
  completionTokens: tokenCountSchema,
  totalTokens: tokenCountSchema,
})
export type TokenUsage = z.infer<typeof tokenUsageSchema>

export const messageUsageSchema = tokenUsageSchema.extend({ estimated: z.boolean() })
export type MessageUsage = z.infer<typeof messageUsageSchema>

export const messageSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  role: messageRoleSchema,
  content: z.string(),
  citations: z.array(citationSchema),
  model: z.string().optional(),
  finishReason: finishReasonSchema.optional(),
  usage: messageUsageSchema.optional(),
  createdAt: timestampSchema,
})
export type Message = z.infer<typeof messageSchema>
