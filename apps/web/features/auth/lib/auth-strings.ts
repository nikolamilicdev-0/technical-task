import type { Dictionary } from '@/core/i18n/dictionary'
import { mapAuthError } from '@/features/auth/lib/map-auth-error'

export type AuthStrings = Dictionary['auth']

/** All sign-in and sign-up copy, for server bodies and client forms alike. */
export function getAuthStrings(dictionary: Dictionary): AuthStrings {
  return dictionary.auth
}

export function getAuthErrorMessage(strings: AuthStrings, error: unknown): string {
  return strings.errors[mapAuthError(error)]
}
