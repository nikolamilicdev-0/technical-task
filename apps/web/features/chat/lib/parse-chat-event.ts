import { type ChatSseEvent, parseChatSseEvent } from '@kb/contracts'

import type { SseMessage } from '@/features/chat/types'

/**
 * The typed chat event an SSE message carries, validated by the shared contract. Unknown event
 * names, malformed JSON and payloads whose `type` disagrees with the event name yield null.
 */
export function parseChatEvent(message: SseMessage): ChatSseEvent | null {
  return parseChatSseEvent(message.event, message.data)
}
