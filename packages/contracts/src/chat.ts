import { z } from 'zod'

import { idSchema } from './common.js'
import { errorCodeSchema, retryAfterSecondsSchema } from './errors.js'
import { MAX_SCOPE_DOCUMENTS, MESSAGE_MAX_LENGTH } from './limits.js'
import {
  citationSchema,
  finishReasonSchema,
  messageSchema,
  messageUsageSchema,
} from './messages.js'

export const EVENT_STREAM_MEDIA_TYPE = 'text/event-stream'

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
  documentIds: z.array(idSchema).min(1).max(MAX_SCOPE_DOCUMENTS).optional(),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>

export const chatUsageSchema = messageUsageSchema.extend({ model: z.string() })
export type ChatUsage = z.infer<typeof chatUsageSchema>

export const chatResultSchema = z.object({
  userMessage: messageSchema,
  assistantMessage: messageSchema,
  usage: chatUsageSchema.optional(),
})
export type ChatResult = z.infer<typeof chatResultSchema>

export const chatMetaEventSchema = z.object({
  type: z.literal('meta'),
  conversationId: idSchema,
  userMessageId: idSchema,
  title: z.string().nullable(),
})
export type ChatMetaEvent = z.infer<typeof chatMetaEventSchema>

export const chatSourcesEventSchema = z.object({
  type: z.literal('sources'),
  citations: z.array(citationSchema),
})
export type ChatSourcesEvent = z.infer<typeof chatSourcesEventSchema>

export const chatDeltaEventSchema = z.object({
  type: z.literal('delta'),
  text: z.string(),
})
export type ChatDeltaEvent = z.infer<typeof chatDeltaEventSchema>

export const chatUsageEventSchema = chatUsageSchema.extend({ type: z.literal('usage') })
export type ChatUsageEvent = z.infer<typeof chatUsageEventSchema>

export const chatDoneEventSchema = z.object({
  type: z.literal('done'),
  userMessageId: idSchema,
  assistantMessageId: idSchema,
  finishReason: finishReasonSchema,
})
export type ChatDoneEvent = z.infer<typeof chatDoneEventSchema>

export const chatErrorEventSchema = z.object({
  type: z.literal('error'),
  code: errorCodeSchema,
  message: z.string(),
  retryAfter: retryAfterSecondsSchema.optional(),
})
export type ChatErrorEvent = z.infer<typeof chatErrorEventSchema>

export const chatSseEventSchema = z.discriminatedUnion('type', [
  chatMetaEventSchema,
  chatSourcesEventSchema,
  chatDeltaEventSchema,
  chatUsageEventSchema,
  chatDoneEventSchema,
  chatErrorEventSchema,
])
export type ChatSseEvent = z.infer<typeof chatSseEventSchema>
export type ChatSseEventType = ChatSseEvent['type']

export const chatSseEventSchemas = {
  meta: chatMetaEventSchema,
  sources: chatSourcesEventSchema,
  delta: chatDeltaEventSchema,
  usage: chatUsageEventSchema,
  done: chatDoneEventSchema,
  error: chatErrorEventSchema,
} as const satisfies { [TType in ChatSseEventType]: z.ZodType<{ type: TType }> }

/** Validates one SSE frame (`event:` name + `data:` JSON); unknown or malformed frames yield null. */
export function parseChatSseEvent(name: string, json: string): ChatSseEvent | null {
  if (!isChatSseEventType(name)) return null
  const result = chatSseEventSchemas[name].safeParse(parseJson(json))
  return result.success ? result.data : null
}

function isChatSseEventType(name: string): name is ChatSseEventType {
  return Object.hasOwn(chatSseEventSchemas, name)
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}
