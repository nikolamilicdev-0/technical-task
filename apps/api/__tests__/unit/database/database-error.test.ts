import { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { toDatabaseError } from '../../../src/database/database-error.js'

const FAILURE = {
  message: 'new row violates row-level security policy for table "documents"',
  details: '',
  hint: '',
  code: '42501',
}

describe('toDatabaseError', () => {
  it('turns the plain object supabase-js reports into an Error with a stack', () => {
    const error = toDatabaseError(FAILURE as PostgrestError)

    expect(error).toBeInstanceOf(PostgrestError)
    expect(error.stack).toContain(FAILURE.message)
    expect(error.toJSON()).toEqual({ name: 'PostgrestError', ...FAILURE })
  })

  it('passes a PostgrestError through untouched', () => {
    const error = new PostgrestError(FAILURE)

    expect(toDatabaseError(error)).toBe(error)
  })
})
