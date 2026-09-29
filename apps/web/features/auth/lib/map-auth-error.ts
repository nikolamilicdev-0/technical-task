import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js'

import type { AuthErrorKind } from '@/features/auth/types'

const TOO_MANY_REQUESTS_STATUS = 429

// Supabase Auth error codes (auth-js ErrorCode) mapped to the copy we show for them.
const KIND_BY_CODE: Readonly<Partial<Record<string, AuthErrorKind>>> = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  user_already_exists: 'userExists',
  email_exists: 'userExists',
  weak_password: 'weakPassword',
  over_request_rate_limit: 'rateLimited',
  over_email_send_rate_limit: 'rateLimited',
  signup_disabled: 'signupDisabled',
  email_provider_disabled: 'signupDisabled',
}

/** Classifies a Supabase Auth failure; unrecognised errors fall back to generic copy. */
export function mapAuthError(error: unknown): AuthErrorKind {
  if (!isAuthError(error)) return 'unknown'
  if (isAuthRetryableFetchError(error)) return 'network'
  const kind = error.code ? KIND_BY_CODE[error.code] : undefined
  if (kind) return kind
  return error.status === TOO_MANY_REQUESTS_STATUS ? 'rateLimited' : 'unknown'
}
