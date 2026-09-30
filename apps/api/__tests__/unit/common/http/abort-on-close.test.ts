import { EventEmitter } from 'node:events'

import { describe, expect, it } from 'vitest'

import { abortOnClose } from '../../../../src/common/http/abort-on-close.js'

describe('abortOnClose', () => {
  it('aborts once the response closes, and only then', () => {
    const response = new EventEmitter()

    const signal = abortOnClose(response)
    expect(signal.aborted).toBe(false)
    response.emit('close')

    expect(signal.aborted).toBe(true)
    expect(response.listenerCount('close')).toBe(0)
  })
})
