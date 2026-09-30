import type { SupabaseClient } from '@supabase/supabase-js'

export interface VerifiedUser {
  readonly userId: string
  readonly email?: string
}

export interface JwtVerifier {
  /** Null for tokens that are not a valid user session; throws only when it cannot verify at all. */
  verify(token: string): Promise<VerifiedUser | null>
}

export type ClaimsReader = Pick<SupabaseClient['auth'], 'getClaims'>
