import type { ChatSseEvent } from '@kb/contracts'
import { HttpStatus, Injectable } from '@nestjs/common'
import type { Response } from 'express'

import { SSE_HEARTBEAT, SSE_HEARTBEAT_INTERVAL_MS, SSE_RESPONSE_HEADERS } from './chat.constants.js'
import { toChatErrorEvent } from './chat-errors.js'
import { formatSseEvent } from './sse-format.js'

/** Streams events as Server-Sent Events (DEC-008), unbuffered, with a heartbeat. */
@Injectable()
export class SseWriter {
  /**
   * Drains `events` to the end even once the client is gone, so the run can still store the
   * partial answer. A failure after the headers went out ends the stream with an `error` frame.
   */
  async stream(response: Response, events: AsyncIterable<ChatSseEvent>): Promise<void> {
    response.status(HttpStatus.OK)
    for (const [name, value] of Object.entries(SSE_RESPONSE_HEADERS)) {
      response.setHeader(name, value)
    }
    response.flushHeaders()
    const heartbeat = setInterval(() => write(response, SSE_HEARTBEAT), SSE_HEARTBEAT_INTERVAL_MS)
    try {
      for await (const event of events) write(response, formatSseEvent(event))
    } catch (error) {
      write(response, formatSseEvent(toChatErrorEvent(error)))
      throw error
    } finally {
      clearInterval(heartbeat)
      response.end()
    }
  }
}

function write(response: Response, frame: string): void {
  if (!response.writableEnded && !response.destroyed) response.write(frame)
}
