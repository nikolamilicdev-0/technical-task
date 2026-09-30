import type { ChatSseEvent } from '@kb/contracts'

// JSON escapes every line break, so the event always fits on one `data:` line.
export function formatSseEvent(event: ChatSseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}
