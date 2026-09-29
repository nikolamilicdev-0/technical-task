import { describe, expect, it } from 'vitest'

import { resolveRequestId } from '../../../../src/common/http/request-id.middleware.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('resolveRequestId', () => {
  it.each(['b7c1e2a4-trace', 'req_42', 'lb:1a2b.3c'])(
    'keeps the well-formed upstream id %o',
    (id) => {
      expect(resolveRequestId(id)).toBe(id)
    }
  )

  it.each([
    ['a missing header', undefined],
    ['an empty header', ''],
    ['a repeated header', ['a', 'b']],
    ['an id with a line break', 'forged\nGET /admin 200'],
    ['an id with spaces', 'two words'],
    ['an overlong id', 'x'.repeat(129)],
  ])('mints a UUID for %s', (_, incoming) => {
    expect(resolveRequestId(incoming)).toMatch(UUID)
  })

  it('mints a different id every time', () => {
    expect(resolveRequestId(undefined)).not.toBe(resolveRequestId(undefined))
  })
})
