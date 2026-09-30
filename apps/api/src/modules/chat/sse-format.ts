import type { ChatSseEvent } from '@kb/contracts'

/**
 * One SSE frame: `event: <type>`, `data: <the whole event as JSON>`, then a blank line.
 * JSON escapes every line break, so the data always fits on a single line.
 */
export function formatSseEvent(event: ChatSseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}
