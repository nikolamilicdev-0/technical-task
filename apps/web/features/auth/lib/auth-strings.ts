import type { Dictionary } from '@/core/i18n/dictionary'
import { mapAuthError } from '@/features/auth/lib/map-auth-error'

export type AuthStrings = Dictionary['auth']

export function getAuthStrings(dictionary: Dictionary): AuthStrings {
  return dictionary.auth
}

export function getAuthErrorMessage(strings: AuthStrings, error: unknown): string {
  return strings.errors[mapAuthError(error)]
}
