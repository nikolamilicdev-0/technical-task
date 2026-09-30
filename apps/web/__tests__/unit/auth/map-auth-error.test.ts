import { AuthApiError, AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { getAuthErrorMessage, getAuthStrings } from '@/features/auth/lib/auth-strings'
import { mapAuthError } from '@/features/auth/lib/map-auth-error'
import type { AuthErrorKind } from '@/features/auth/types'
import en from '@/messages/en.json'

const apiError = (code: string, status = 400) => new AuthApiError('Auth failed', status, code)

describe('mapAuthError', () => {
  it.each([
    ['invalid_credentials', 'invalidCredentials'],
    ['email_not_confirmed', 'emailNotConfirmed'],
    ['user_already_exists', 'userExists'],
    ['email_exists', 'userExists'],
    ['weak_password', 'weakPassword'],
    ['over_request_rate_limit', 'rateLimited'],
    ['over_email_send_rate_limit', 'rateLimited'],
    ['signup_disabled', 'signupDisabled'],
  ] as const)('maps the %s code', (code, kind) => {
    expect(mapAuthError(apiError(code))).toBe(kind)
  })

  it('recognises the weak-password error class', () => {
    expect(mapAuthError(new AuthWeakPasswordError('Weak', 422, ['length']))).toBe('weakPassword')
  })

  it('treats a 429 without a known code as rate limiting', () => {
    expect(mapAuthError(apiError('unexpected_code', 429))).toBe('rateLimited')
  })

  it('reports unreachable Auth servers as a network problem', () => {
    expect(mapAuthError(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('network')
  })

  it.each([
    ['an unknown auth code', apiError('something_new')],
    ['a plain error', new Error('boom')],
    ['a thrown string', 'boom'],
  ])('falls back to generic copy for %s', (_label, error) => {
    expect(mapAuthError(error)).toBe('unknown')
  })
})

describe('getAuthErrorMessage', () => {
  it('returns the dictionary copy for the mapped kind', () => {
    const strings = getAuthStrings(en)
    expect(getAuthErrorMessage(strings, apiError('invalid_credentials'))).toBe(
      'Email or password is incorrect.'
    )
  })

  it('has copy for every kind', () => {
    const kinds: AuthErrorKind[] = [
      'invalidCredentials',
      'emailNotConfirmed',
      'userExists',
      'weakPassword',
      'rateLimited',
      'signupDisabled',
      'network',
      'unknown',
    ]
    for (const kind of kinds) expect(en.auth.errors[kind]).toEqual(expect.any(String))
  })
})
