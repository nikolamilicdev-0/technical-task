import { apiErrorSchema, ERROR_CODES, ERROR_HTTP_STATUS } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { issuePaths } from '../fixtures.js'

describe('apiErrorSchema', () => {
  it.each([
    ['a minimal error', { code: 'not_found', messages: ['Document not found'] }],
    [
      'a validation error with field errors',
      {
        code: 'invalid_payload',
        messages: ['Invalid request payload'],
        errors: { title: ['Required'], 'tags.0': ['Too long'] },
      },
    ],
    [
      'a rate limit with retry hint',
      { code: 'rate_limited', messages: ['Slow down'], retryAfter: 30 },
    ],
  ])('accepts %s', (_, input) => {
    expect(apiErrorSchema.safeParse(input).success).toBe(true)
  })

  it.each([
    ['an unknown code', { code: 'teapot', messages: [] }, 'code'],
    ['a single message string', { code: 'forbidden', messages: 'Nope' }, 'messages'],
    [
      'field errors that are not lists',
      { code: 'invalid_payload', messages: [], errors: { title: 'Required' } },
      'errors.title',
    ],
    ['a zero retry hint', { code: 'rate_limited', messages: [], retryAfter: 0 }, 'retryAfter'],
    [
      'a fractional retry hint',
      { code: 'rate_limited', messages: [], retryAfter: 1.5 },
      'retryAfter',
    ],
  ])('rejects %s', (_, input, path) => {
    expect(issuePaths(apiErrorSchema, input)).toContain(path)
  })
})

describe('ERROR_HTTP_STATUS', () => {
  it('maps every error code', () => {
    expect(Object.keys(ERROR_HTTP_STATUS).sort()).toEqual([...ERROR_CODES].sort())
  })

  it.each([
    ['invalid_payload', 422],
    ['unauthenticated', 401],
    ['forbidden', 403],
    ['not_found', 404],
    ['payload_too_large', 413],
    ['unsupported_media_type', 415],
    ['rate_limited', 429],
    ['ai_provider_error', 502],
    ['ai_provider_unavailable', 503],
    ['internal_error', 500],
  ] as const)('%s → %i', (code, status) => {
    expect(ERROR_HTTP_STATUS[code]).toBe(status)
  })
})
