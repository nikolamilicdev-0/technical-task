// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { parseSse } from '@/features/chat/lib/parse-sse'
import type { SseMessage } from '@/features/chat/types'

const encoder = new TextEncoder()

type Chunk = string | Uint8Array

function streamOf(...chunks: Chunk[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk)
      }
      controller.close()
    },
  })
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<SseMessage[]> {
  const messages: SseMessage[] = []
  for await (const message of parseSse(stream)) messages.push(message)
  return messages
}

const parse = (...chunks: Chunk[]) => collect(streamOf(...chunks))

const dataOf = (messages: SseMessage[]) => messages.map((message) => message.data)

/** One chunk per byte: the harshest way a network can deliver a stream. */
function bytewise(text: string): Uint8Array[] {
  return Array.from(encoder.encode(text), (byte) => Uint8Array.of(byte))
}

describe('parseSse', () => {
  it('dispatches one message per frame that ends in a blank line', async () => {
    const messages = await parse('event: delta\ndata: {"text":"Hi"}\n\nevent: done\ndata: {}\n\n')
    expect(messages).toEqual([
      { event: 'delta', data: '{"text":"Hi"}', id: '' },
      { event: 'done', data: '{}', id: '' },
    ])
  })

  it('names frames without an event field "message"', async () => {
    expect(await parse('data: plain\n\n')).toEqual([{ event: 'message', data: 'plain', id: '' }])
  })

  it('joins multi-line data with line feeds', async () => {
    expect(dataOf(await parse('data: first\ndata: second\ndata: third\n\n'))).toEqual([
      'first\nsecond\nthird',
    ])
  })

  it('accepts CRLF line endings', async () => {
    const messages = await parse('event: meta\r\ndata: a\r\ndata: b\r\n\r\n')
    expect(messages).toEqual([{ event: 'meta', data: 'a\nb', id: '' }])
  })

  it('accepts CR-only line endings', async () => {
    expect(await parse('event: meta\rdata: a\r\r')).toEqual([{ event: 'meta', data: 'a', id: '' }])
  })

  it('holds back a chunk-final CR so a CRLF split across chunks is one line break', async () => {
    expect(dataOf(await parse('data: 1\r', '\ndata: 2\r\n\r\n'))).toEqual(['1\n2'])
  })

  it('still ends the line at a held-back CR when no LF follows', async () => {
    expect(dataOf(await parse('data: 1\r', 'data: 2\r\r'))).toEqual(['1\n2'])
  })

  it('skips comment lines such as heartbeats', async () => {
    const messages = await parse(
      ': keep-alive\n\nevent: delta\n: note\ndata: a\n\n: keep-alive\n\n'
    )
    expect(messages).toEqual([{ event: 'delta', data: 'a', id: '' }])
  })

  it('removes exactly one leading space from a value', async () => {
    expect(dataOf(await parse('data:  indented\ndata:tight\n\n'))).toEqual([' indented\ntight'])
  })

  it('reads a field without a colon as an empty value', async () => {
    const messages = await parse('event\ndata\ndata\n\n')
    expect(messages).toEqual([{ event: 'message', data: '\n', id: '' }])
  })

  it('dispatches a frame whose only data line is empty', async () => {
    expect(dataOf(await parse('data:\n\n'))).toEqual([''])
  })

  it('drops frames without data and does not leak their event name', async () => {
    const messages = await parse('event: ping\n\ndata: a\n\n')
    expect(messages).toEqual([{ event: 'message', data: 'a', id: '' }])
  })

  it('keeps the last event id across frames and ignores ids containing NUL', async () => {
    const messages = await parse('id: 7\ndata: a\n\ndata: b\n\nid: bad\u0000id\ndata: c\n\n')
    expect(messages.map((message) => message.id)).toEqual(['7', '7', '7'])
  })

  it('reads retry only when it is made of digits', async () => {
    const messages = await parse('retry: 3000\ndata: a\n\nretry: soon\ndata: b\n\n')
    expect(messages.map((message) => message.retry)).toEqual([3000, 3000])
  })

  it('ignores unknown fields', async () => {
    expect(await parse('foo: bar\ndata: a\n\n')).toEqual([{ event: 'message', data: 'a', id: '' }])
  })

  it('parses frames delivered one byte at a time', async () => {
    const text = 'event: delta\r\ndata: {"text":"one"}\r\n\r\n: keep-alive\r\rdata: two\n\n'
    expect(await parse(...bytewise(text))).toEqual(await parse(text))
  })

  it('decodes multibyte characters split across chunks', async () => {
    const bytes = encoder.encode('data: 5 € for 🙂\n\n')
    const euro = bytes.indexOf(0xe2)
    const emoji = bytes.indexOf(0xf0)
    const chunks = [
      bytes.slice(0, euro + 1),
      bytes.slice(euro + 1, emoji + 2),
      bytes.slice(emoji + 2),
    ]
    expect(dataOf(await parse(...chunks))).toEqual(['5 € for 🙂'])
  })

  it('strips a leading byte order mark', async () => {
    expect(await parse('﻿event: meta\ndata: a\n\n')).toEqual([{ event: 'meta', data: 'a', id: '' }])
  })

  it('delivers the last frame when the stream ends without a blank line', async () => {
    expect(dataOf(await parse('data: a\n\ndata: b'))).toEqual(['a', 'b'])
  })

  it('treats a CR at the very end of the stream as a line break', async () => {
    expect(dataOf(await parse('data: a\r'))).toEqual(['a'])
  })

  it('rethrows a stream failure', async () => {
    const failure = new Error('connection reset')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(failure)
      },
    })
    await expect(collect(stream)).rejects.toBe(failure)
  })

  it('cancels the stream when the consumer stops early', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: a\n\ndata: b\n\n'))
      },
      cancel,
    })
    const messages = parseSse(stream)
    await expect(messages.next()).resolves.toMatchObject({ value: { data: 'a' } })
    await messages.return(undefined)
    expect(cancel).toHaveBeenCalledOnce()
  })
})
