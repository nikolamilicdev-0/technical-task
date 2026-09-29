import { describe, expect, it } from 'vitest'

import { extractBearerToken } from '../../../src/auth/bearer-token.js'

const JWT = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl-_x'

describe('extractBearerToken', () => {
  it.each([
    [`Bearer ${JWT}`, JWT],
    [`bearer ${JWT}`, JWT],
    [`BEARER   ${JWT}`, JWT],
    [`  Bearer ${JWT}  `, JWT],
    ['Bearer abc+/~.-_==', 'abc+/~.-_=='],
  ])('reads %o', (header, token) => {
    expect(extractBearerToken(header)).toBe(token)
  })

  it.each([
    undefined,
    '',
    'Bearer',
    'Bearer ',
    `Basic ${JWT}`,
    JWT,
    `Bearer ${JWT} extra`,
    'Bearer a=b',
    'Bearer <script>',
  ])('ignores %o', (header) => {
    expect(extractBearerToken(header)).toBeUndefined()
  })
})
