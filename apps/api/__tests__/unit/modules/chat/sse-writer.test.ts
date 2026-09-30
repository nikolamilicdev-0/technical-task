import { EventEmitter } from 'node:events'

import type { ChatSseEvent } from '@kb/contracts'
import type { Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  SSE_HEARTBEAT,
  SSE_HEARTBEAT_INTERVAL_MS,
} from '../../../../src/modules/chat/chat.constants.js'
import { formatSseEvent } from '../../../../src/modules/chat/sse-format.js'
import { SseWriter } from '../../../../src/modules/chat/sse-writer.js'

class FakeResponse extends EventEmitter {
  statusCode = 0
  readonly headers = new Map<string, string>()
  readonly frames: string[] = []
  headersFlushed = false
  writableEnded = false
  destroyed = false

  status(code: number): this {
    this.statusCode = code
    return this
  }

  setHeader(name: string, value: string): void {
    this.headers.set(name, value)
  }

  flushHeaders(): void {
    this.headersFlushed = true
  }

  write(frame: string): boolean {
    this.frames.push(frame)
    return true
  }

  end(): void {
    this.writableEnded = true
  }
}

const DELTAS: ChatSseEvent[] = ['One', 'Two', 'Three'].map((text) => ({ type: 'delta', text }))
const writer = new SseWriter()

function stream(response: FakeResponse, events: AsyncIterable<ChatSseEvent>): Promise<void> {
  return writer.stream(response as unknown as Response, events)
}

async function* emit(events: readonly ChatSseEvent[]): AsyncGenerator<ChatSseEvent> {
  for (const event of events) yield event
}

afterEach(() => {
  vi.useRealTimers()
})

describe('SseWriter', () => {
  it('sends unbuffered event-stream headers first, then every frame, then ends', async () => {
    const response = new FakeResponse()

    await stream(response, emit(DELTAS))

    expect(response.statusCode).toBe(200)
    expect(Object.fromEntries(response.headers)).toEqual({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    expect(response.headersFlushed).toBe(true)
    expect(response.frames).toEqual(DELTAS.map(formatSseEvent))
    expect(response.writableEnded).toBe(true)
  })

  it('writes a heartbeat comment while the stream is quiet, and stops it at the end', async () => {
    vi.useFakeTimers()
    const response = new FakeResponse()
    let answer = (): void => undefined
    const answered = new Promise<void>((resolve) => (answer = resolve))
    async function* slow(): AsyncGenerator<ChatSseEvent> {
      await answered
      yield { type: 'delta', text: 'Late' }
    }

    const done = stream(response, slow())
    await vi.advanceTimersByTimeAsync(SSE_HEARTBEAT_INTERVAL_MS * 2)
    answer()
    await done
    await vi.advanceTimersByTimeAsync(SSE_HEARTBEAT_INTERVAL_MS * 2)

    expect(response.frames).toEqual([
      SSE_HEARTBEAT,
      SSE_HEARTBEAT,
      formatSseEvent({ type: 'delta', text: 'Late' }),
    ])
  })

  it('keeps draining the events after the client is gone, writing nothing more', async () => {
    const response = new FakeResponse()
    const drained: string[] = []
    async function* events(): AsyncGenerator<ChatSseEvent> {
      for (const event of DELTAS) {
        yield event
        if (event.type === 'delta') drained.push(event.text)
        response.destroyed = true
      }
    }

    await stream(response, events())

    expect(drained).toEqual(['One', 'Two', 'Three'])
    expect(response.frames).toEqual([formatSseEvent(DELTAS[0])])
    expect(response.writableEnded).toBe(true)
  })

  it('ends a stream that fails midway with an error frame and rethrows the failure', async () => {
    const response = new FakeResponse()
    const failure = new Error('database gone')
    async function* failing(): AsyncGenerator<ChatSseEvent> {
      yield { type: 'delta', text: 'Partial' }
      throw failure
    }

    await expect(stream(response, failing())).rejects.toBe(failure)

    expect(response.frames).toEqual([
      formatSseEvent({ type: 'delta', text: 'Partial' }),
      formatSseEvent({ type: 'error', code: 'internal_error', message: 'Unexpected server error' }),
    ])
    expect(response.writableEnded).toBe(true)
  })
})
