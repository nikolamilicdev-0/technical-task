import { Module } from '@nestjs/common'

import { SupabaseClientFactory } from '../database/supabase-client.factory.js'
import { JWT_VERIFIER } from './auth.constants.js'
import type { JwtVerifier } from './jwt-verifier.types.js'
import { SupabaseJwtVerifier } from './supabase-jwt.verifier.js'

// The anonymous client is a singleton, so the JWKS it fetches stays cached across requests.
function createJwtVerifier(clients: SupabaseClientFactory): JwtVerifier {
  return new SupabaseJwtVerifier(clients.anonymous().auth)
}

@Module({
  providers: [
    { provide: JWT_VERIFIER, inject: [SupabaseClientFactory], useFactory: createJwtVerifier },
  ],
  exports: [JWT_VERIFIER],
})
export class AuthModule {}
