import type { SseMessage } from '@/features/chat/types'

const LINE_BREAK = /\r\n|\r|\n/g
const CARRIAGE_RETURN = '\r'
const FIELD_SEPARATOR = ':'
const VALUE_PADDING = ' '
const DATA_SEPARATOR = '\n'
const DEFAULT_EVENT = 'message'
const NUL = '\u0000'
const DIGITS = /^\d+$/

interface FrameState {
  event: string
  data: string[]
  lastEventId: string
  retry: number | undefined
}

interface LineSplit {
  lines: string[]
  rest: string
}

// The HTML standard's event-stream rules, with one leniency: a final frame the stream ends
// without its blank line is still delivered.
export async function* parseSse(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<SseMessage, void, undefined> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const state: FrameState = { event: '', data: [], lastEventId: '', retry: undefined }
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      // `stream: true` keeps a multibyte character split across chunks for the next read.
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const { lines, rest } = splitLines(buffer, done)
      buffer = rest
      for (const line of lines) {
        const message = processLine(state, line)
        if (message) yield message
      }
      if (done) {
        const last = dispatch(state)
        if (last) yield last
        return
      }
    }
  } finally {
    // Closes the connection when the consumer stops early; a no-op once the stream has ended.
    await reader.cancel().catch(() => undefined)
  }
}

/** A chunk-final CR waits for the next chunk, in case an LF follows it. */
function splitLines(buffer: string, final: boolean): LineSplit {
  const lines: string[] = []
  let start = 0
  for (const match of buffer.matchAll(LINE_BREAK)) {
    const [lineBreak] = match
    if (!final && lineBreak === CARRIAGE_RETURN && match.index === buffer.length - 1) break
    lines.push(buffer.slice(start, match.index))
    start = match.index + lineBreak.length
  }
  const rest = buffer.slice(start)
  if (final && rest !== '') lines.push(rest)
  return { lines, rest: final ? '' : rest }
}

function processLine(state: FrameState, line: string): SseMessage | null {
  if (line === '') return dispatch(state)
  if (line.startsWith(FIELD_SEPARATOR)) return null

  const separator = line.indexOf(FIELD_SEPARATOR)
  const field = separator === -1 ? line : line.slice(0, separator)
  const raw = separator === -1 ? '' : line.slice(separator + 1)
  const value = raw.startsWith(VALUE_PADDING) ? raw.slice(VALUE_PADDING.length) : raw
  applyField(state, field, value)
  return null
}

function applyField(state: FrameState, field: string, value: string): void {
  switch (field) {
    case 'event':
      state.event = value
      return
    case 'data':
      state.data.push(value)
      return
    case 'id':
      if (!value.includes(NUL)) state.lastEventId = value
      return
    case 'retry':
      if (DIGITS.test(value)) state.retry = Number(value)
      return
  }
}

function dispatch(state: FrameState): SseMessage | null {
  const { event, data, lastEventId, retry } = state
  state.event = ''
  state.data = []
  if (data.length === 0) return null
  return {
    event: event || DEFAULT_EVENT,
    data: data.join(DATA_SEPARATOR),
    id: lastEventId,
    ...(retry === undefined ? {} : { retry }),
  }
}
