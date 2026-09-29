import type { z } from 'zod'

import type { Dictionary } from '@/core/i18n/dictionary'
import type { loginSchema, signupSchema } from '@/features/auth/schema'

export type LoginValues = z.input<typeof loginSchema>

export type SignupValues = z.input<typeof signupSchema>

/** Every kind has copy under `auth.errors` in `messages/en.json`. */
export type AuthErrorKind = keyof Dictionary['auth']['errors']

/** With email confirmation enabled, sign-up succeeds without a session. */
export type SignupResult =
  { status: 'signedIn' } | { status: 'confirmationRequired'; email: string }
