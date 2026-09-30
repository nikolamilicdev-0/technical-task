import {
  type ChatErrorEvent,
  type ChatResult,
  chatResultSchema,
  type ChatUsage,
  type ChatUsageEvent,
} from '@kb/contracts'

import { toApiException } from './chat-errors.js'
import type { ChatEventStream } from './chat.types.js'

/**
 * Runs an exchange to the end for a JSON response. An `error` event throws the exception the
 * endpoint answers with; null means the run stopped without an answer (the client went away).
 */
export async function collectChatResult(events: ChatEventStream): Promise<ChatResult | null> {
  let usage: ChatUsage | undefined
  let failure: ChatErrorEvent | undefined
  let finished = false
  let step = await events.next()
  while (step.done !== true) {
    const event = step.value
    if (event.type === 'usage') usage = toChatUsage(event)
    else if (event.type === 'error') failure = event
    else if (event.type === 'done') finished = true
    step = await events.next()
  }
  if (failure !== undefined) throw toApiException(failure)
  const outcome = step.value
  if (!finished || outcome === null || outcome.assistantMessage === null) return null
  return chatResultSchema.parse({
    userMessage: outcome.userMessage,
    assistantMessage: outcome.assistantMessage,
    ...(usage === undefined ? {} : { usage }),
  })
}

function toChatUsage({ type: _type, ...usage }: ChatUsageEvent): ChatUsage {
  return usage
}
