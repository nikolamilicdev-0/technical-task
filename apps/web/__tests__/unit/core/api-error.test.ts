import { describe, expect, it } from 'vitest'

import {
  ApiError,
  isApiError,
  isRetryableError,
  networkError,
  parseErrorBody,
  parseRetryAfter,
} from '@/core/api/api-error'

describe('parseErrorBody', () => {
  it('keeps the contracts error shape', () => {
    const error = parseErrorBody(422, {
      code: 'invalid_payload',
      messages: ['Invalid request payload'],
      errors: { title: ['Required'] },
    })
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'invalid_payload',
      messages: ['Invalid request payload'],
      fieldErrors: { title: ['Required'] },
      message: 'Invalid request payload',
    })
  })

  it('takes retryAfter from the body, then from the Retry-After header', () => {
    const body = { code: 'rate_limited', messages: ['Slow down'] }
    expect(parseErrorBody(429, { ...body, retryAfter: 12 }, '30').retryAfter).toBe(12)
    expect(parseErrorBody(429, body, '30').retryAfter).toBe(30)
  })

  it.each([
    [401, 'unauthenticated'],
    [404, 'not_found'],
    [413, 'payload_too_large'],
    [418, 'invalid_payload'],
    [500, 'internal_error'],
    [502, 'internal_error'],
    [503, 'internal_error'],
  ] as const)('derives the code of a %d without a contracts body', (status, code) => {
    const error = parseErrorBody(status, '<html>Bad gateway</html>')
    expect(error.code).toBe(code)
    expect(error.messages).toEqual([])
    expect(error.fieldErrors).toEqual({})
  })
})

describe('ApiError', () => {
  it('falls back to the code as its message', () => {
    const error = new ApiError({ status: 404, code: 'not_found' })
    expect(error.message).toBe('not_found')
    expect(error.name).toBe('ApiError')
    expect(error).toBeInstanceOf(Error)
  })

  it('marks requests that never got a response', () => {
    expect(networkError().isNetworkError).toBe(true)
    expect(new ApiError({ status: 500, code: 'internal_error' }).isNetworkError).toBe(false)
  })
})

describe('isApiError', () => {
  it('recognises only ApiError instances', () => {
    expect(isApiError(networkError())).toBe(true)
    expect(isApiError(new Error('boom'))).toBe(false)
    expect(isApiError({ code: 'not_found' })).toBe(false)
  })
})

describe('isRetryableError', () => {
  it.each([
    ['a network failure', networkError(), true],
    ['a 500', new ApiError({ status: 500, code: 'internal_error' }), true],
    ['a 503', new ApiError({ status: 503, code: 'ai_provider_unavailable' }), true],
    ['a 404', new ApiError({ status: 404, code: 'not_found' }), false],
    ['a 429', new ApiError({ status: 429, code: 'rate_limited' }), false],
    ['a plain error', new Error('bug'), false],
  ])('retries %s: %s', (_label, error, expected) => {
    expect(isRetryableError(error)).toBe(expected)
  })
})

describe('parseRetryAfter', () => {
  const now = Date.parse('2026-09-29T12:00:00Z')

  it.each([
    ['120', 120],
    [' 5 ', 5],
    ['0', undefined],
    ['soon', undefined],
    ['', undefined],
    [null, undefined],
    ['Tue, 29 Sep 2026 12:00:30 GMT', 30],
    ['Tue, 29 Sep 2026 11:00:00 GMT', undefined],
  ])('reads %j as %j seconds', (header, expected) => {
    expect(parseRetryAfter(header, now)).toBe(expected)
  })
})
