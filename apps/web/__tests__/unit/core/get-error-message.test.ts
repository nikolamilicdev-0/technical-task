import { ERROR_CODES } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { ApiError, networkError } from '@/core/api/api-error'
import { getErrorMessage } from '@/core/api/get-error-message'
import type { ErrorMessages } from '@/core/api/types'
import en from '@/messages/en.json'

describe('getErrorMessage', () => {
  it('uses the localized copy for the error code', () => {
    const error = new ApiError({ status: 404, code: 'not_found', messages: ['Document not found'] })
    expect(getErrorMessage(error, en.errors)).toBe(en.errors.codes.not_found)
  })

  it('says when to retry after a rate limit', () => {
    const error = new ApiError({ status: 429, code: 'rate_limited', retryAfter: 30 })
    expect(getErrorMessage(error, en.errors)).toBe('Too many requests. Try again in 30 s.')
  })

  it('uses the plain rate-limit copy without a retry hint', () => {
    const error = new ApiError({ status: 429, code: 'rate_limited' })
    expect(getErrorMessage(error, en.errors)).toBe(en.errors.codes.rate_limited)
  })

  it('explains network failures', () => {
    expect(getErrorMessage(networkError(), en.errors)).toBe(en.errors.network)
  })

  it('falls back to the server message, then to generic copy, for codes without copy', () => {
    const withoutCodes: ErrorMessages = { ...en.errors, codes: {} }
    const described = new ApiError({ status: 403, code: 'forbidden', messages: ['Not yours'] })
    const bare = new ApiError({ status: 403, code: 'forbidden' })
    expect(getErrorMessage(described, withoutCodes)).toBe('Not yours')
    expect(getErrorMessage(bare, withoutCodes)).toBe(en.errors.unknown)
  })

  it('uses generic copy for errors that are not API errors', () => {
    expect(getErrorMessage(new TypeError('x is undefined'), en.errors)).toBe(en.errors.unknown)
  })

  it('has dictionary copy for every contracts error code', () => {
    const codes: Record<string, string> = en.errors.codes
    for (const code of ERROR_CODES) expect(codes[code]).toEqual(expect.any(String))
  })
})
