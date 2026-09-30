import { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { DatabaseRequestError } from '../../../src/database/database-error.js'

const FAILURE = {
  message: 'new row violates row-level security policy for table "documents"',
  details: '',
  hint: '',
  code: '42501',
}

describe('DatabaseRequestError', () => {
  it('turns the plain object supabase-js reports into a PostgrestError with a stack', () => {
    const { cause } = new DatabaseRequestError(FAILURE as PostgrestError, 403)

    expect(cause instanceof PostgrestError && cause.toJSON()).toEqual({
      name: 'PostgrestError',
      ...FAILURE,
    })
    expect(cause instanceof Error && cause.stack).toContain(FAILURE.message)
  })

  it('keeps a PostgrestError as its cause untouched', () => {
    const error = new PostgrestError(FAILURE)

    expect(new DatabaseRequestError(error, 403).cause).toBe(error)
  })

  it('keeps the message, HTTP status and code, with the PostgREST error as its cause', () => {
    const error = new DatabaseRequestError(FAILURE as PostgrestError, 403)

    expect(error.message).toBe(FAILURE.message)
    expect(error.status).toBe(403)
    expect(error.code).toBe('42501')
    expect(error.cause).toBeInstanceOf(PostgrestError)
  })

  it.each([
    ['no answer at all', 0, true],
    ['a timed-out request', 408, true],
    ['a rate-limited request', 429, true],
    ['a server error', 500, true],
    ['an unavailable database', 503, true],
    ['a rejected request', 400, false],
    ['a forbidden request', 403, false],
    ['a conflict', 409, false],
  ])('is transient for %s (status %s): %s', (_, status, transient) => {
    expect(new DatabaseRequestError(FAILURE as PostgrestError, status).transient).toBe(transient)
  })
})
