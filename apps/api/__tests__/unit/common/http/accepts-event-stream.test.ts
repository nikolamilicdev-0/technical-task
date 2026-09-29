import { describe, expect, it } from 'vitest'

import { acceptsEventStream } from '../../../../src/common/http/accepts-event-stream.js'

describe('acceptsEventStream', () => {
  it.each([
    'text/event-stream',
    'Text/Event-Stream',
    'text/event-stream; charset=utf-8',
    'application/json, text/event-stream',
    'text/event-stream;q=0.5, application/json;q=0.9',
    ' text/event-stream ; Q=1 ',
  ])('streams for %o', (accept) => {
    expect(acceptsEventStream(accept)).toBe(true)
  })

  it.each([
    undefined,
    '',
    '*/*',
    'text/*',
    'application/json',
    'text/event-stream;q=0',
    'text/event-stream;q=0.000',
    'text/event-stream;q=high',
    'text/event-stream;q=',
    'text/event-streams',
  ])('answers with JSON for %o', (accept) => {
    expect(acceptsEventStream(accept)).toBe(false)
  })
})
