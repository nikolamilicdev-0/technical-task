import type { z } from 'zod'

import type { Dictionary } from '@/core/i18n/dictionary'
import type { loginSchema, signupSchema } from '@/features/auth/schema'

export type LoginValues = z.input<typeof loginSchema>

export type SignupValues = z.input<typeof signupSchema>

export type AuthErrorKind = keyof Dictionary['auth']['errors']

export type SignupResult =
  { status: 'signedIn' } | { status: 'confirmationRequired'; email: string }
