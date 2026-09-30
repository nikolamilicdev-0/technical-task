// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ApiError, networkError } from '@/core/api/api-error'
import {
  canRetry,
  fromErrorEvent,
  INTERRUPTED_STREAM_ERROR,
  toStreamError,
} from '@/features/chat/lib/to-stream-error'

describe('toStreamError', () => {
  it('keeps the code, first message and retry delay of an API error', () => {
    const error = new ApiError({
      status: 429,
      code: 'rate_limited',
      messages: ['Too many requests'],
      retryAfter: 12,
    })
    expect(toStreamError(error)).toEqual({
      code: 'rate_limited',
      message: 'Too many requests',
      retryAfter: 12,
    })
  })

  it('reports a request that never reached the API as a network failure', () => {
    expect(toStreamError(networkError())).toEqual({
      code: 'network',
      message: null,
      retryAfter: null,
    })
  })

  it('reports anything else, such as a body read that broke off, as interrupted', () => {
    expect(toStreamError(new TypeError('terminated'))).toEqual(INTERRUPTED_STREAM_ERROR)
  })
})

describe('fromErrorEvent', () => {
  it('reads the code, message and retry delay of an error frame', () => {
    const event = {
      type: 'error',
      code: 'ai_provider_unavailable',
      message: 'Down',
      retryAfter: 30,
    } as const
    expect(fromErrorEvent(event)).toEqual({
      code: 'ai_provider_unavailable',
      message: 'Down',
      retryAfter: 30,
    })
  })

  it('has no retry delay or message when the frame carries none', () => {
    expect(fromErrorEvent({ type: 'error', code: 'internal_error', message: '' })).toEqual({
      code: 'internal_error',
      message: null,
      retryAfter: null,
    })
  })
})

describe('canRetry', () => {
  it.each([
    'rate_limited',
    'ai_provider_error',
    'network',
    'interrupted',
    'internal_error',
  ] as const)('offers a retry after %s', (code) => {
    expect(canRetry({ code, message: null, retryAfter: null })).toBe(true)
  })

  it.each(['not_found', 'invalid_payload', 'forbidden', 'unauthenticated'] as const)(
    'offers none after %s, which would fail the same way',
    (code) => {
      expect(canRetry({ code, message: null, retryAfter: null })).toBe(false)
    }
  )
})
