import { type ChatSseEvent, parseChatSseEvent } from '@kb/contracts'

import type { SseMessage } from '@/features/chat/types'

export function parseChatEvent(message: SseMessage): ChatSseEvent | null {
  return parseChatSseEvent(message.event, message.data)
}
