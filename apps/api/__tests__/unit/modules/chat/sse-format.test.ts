import { parseChatSseEvent } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { SSE_HEARTBEAT } from '../../../../src/modules/chat/chat.constants.js'
import { formatSseEvent } from '../../../../src/modules/chat/sse-format.js'

describe('formatSseEvent', () => {
  it('writes the event name, the whole event as JSON and a blank line', () => {
    expect(formatSseEvent({ type: 'delta', text: 'Hi' })).toBe(
      'event: delta\ndata: {"type":"delta","text":"Hi"}\n\n'
    )
  })

  it('keeps multi-line text on one data line that parses back to the event', () => {
    const event = { type: 'delta', text: 'Line one\nLine two\r\n\n- item' } as const

    const [eventLine, dataLine, ...rest] = formatSseEvent(event).split('\n')

    expect(eventLine).toBe('event: delta')
    expect(rest).toEqual(['', ''])
    expect(parseChatSseEvent('delta', dataLine?.slice('data: '.length) ?? '')).toEqual(event)
  })

  it('uses a comment for the heartbeat, which SSE parsers skip', () => {
    expect(SSE_HEARTBEAT).toBe(': keep-alive\n\n')
  })
})
