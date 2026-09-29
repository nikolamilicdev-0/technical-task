import { isAuthRetryableFetchError, type JwtPayload } from '@supabase/supabase-js'

import { AUTHENTICATED_ROLE } from './auth.constants.js'
import type { ClaimsReader, JwtVerifier, VerifiedUser } from './jwt-verifier.types.js'

/** `getClaims`: checks ES256 tokens locally against the cached JWKS, HS256 ones through Auth. */
export class SupabaseJwtVerifier implements JwtVerifier {
  constructor(private readonly auth: ClaimsReader) {}

  async verify(token: string): Promise<VerifiedUser | null> {
    const { data, error } = await this.auth.getClaims(token)
    // Unreachable Auth is an outage, not a bad token: a 401 would make the web app sign users out.
    if (isAuthRetryableFetchError(error)) throw error
    return data === null ? null : toVerifiedUser(data.claims)
  }
}

function toVerifiedUser({ role, sub, email }: JwtPayload): VerifiedUser | null {
  if (role !== AUTHENTICATED_ROLE || !sub) return null
  return email ? { userId: sub, email } : { userId: sub }
}
