import type { SupabaseClient } from '@supabase/supabase-js'

/** The identity inside a verified access token. */
export interface VerifiedUser {
  readonly userId: string
  readonly email?: string
}

/** Access-token verification port; the guard never talks to Supabase Auth itself. */
export interface JwtVerifier {
  /** Null for tokens that are not a valid user session; throws only when it cannot verify at all. */
  verify(token: string): Promise<VerifiedUser | null>
}

/** The slice of Supabase Auth that token verification uses. */
export type ClaimsReader = Pick<SupabaseClient['auth'], 'getClaims'>
