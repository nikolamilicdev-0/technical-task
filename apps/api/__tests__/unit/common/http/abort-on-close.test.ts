import { EventEmitter } from 'node:events'

import { describe, expect, it } from 'vitest'

import { abortOnClose } from '../../../../src/common/http/abort-on-close.js'

const responseThat = (closed: boolean) => Object.assign(new EventEmitter(), { closed })

describe('abortOnClose', () => {
  it('aborts once the response closes, and only then', () => {
    const response = responseThat(false)

    const signal = abortOnClose(response)
    expect(signal.aborted).toBe(false)
    response.emit('close')

    expect(signal.aborted).toBe(true)
    expect(response.listenerCount('close')).toBe(0)
  })

  it('aborts at once for a client that left before the handler ran', () => {
    const response = responseThat(true)

    expect(abortOnClose(response).aborted).toBe(true)
    expect(response.listenerCount('close')).toBe(0)
  })
})
