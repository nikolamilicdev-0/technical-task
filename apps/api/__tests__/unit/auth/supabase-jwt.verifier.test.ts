import { AuthInvalidJwtError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import type { ClaimsReader } from '../../../src/auth/jwt-verifier.types.js'
import { SupabaseJwtVerifier } from '../../../src/auth/supabase-jwt.verifier.js'
import { buildClaims, TEST_USER } from '../../fixtures.js'

const TOKEN = 'header.payload.signature'
const HEADER = { alg: 'ES256', kid: 'local-key', typ: 'JWT' }

function verifierReturning(result: Awaited<ReturnType<ClaimsReader['getClaims']>>) {
  const getClaims = vi.fn<ClaimsReader['getClaims']>().mockResolvedValue(result)
  return { verifier: new SupabaseJwtVerifier({ getClaims }), getClaims }
}

function withClaims(overrides: Parameters<typeof buildClaims>[0]) {
  return verifierReturning({
    data: { claims: buildClaims(overrides), header: HEADER, signature: new Uint8Array() },
    error: null,
  })
}

describe('SupabaseJwtVerifier', () => {
  it('returns the user of a valid session token', async () => {
    const { verifier, getClaims } = withClaims({})

    await expect(verifier.verify(TOKEN)).resolves.toEqual({
      userId: TEST_USER.id,
      email: TEST_USER.email,
    })
    expect(getClaims).toHaveBeenCalledWith(TOKEN)
  })

  it('leaves the email out when the token has none', async () => {
    await expect(withClaims({ email: undefined }).verifier.verify(TOKEN)).resolves.toEqual({
      userId: TEST_USER.id,
    })
  })

  it.each([
    ['the anon key', { role: 'anon' }],
    ['the service-role key', { role: 'service_role' }],
    ['a token without a subject', { sub: '' }],
  ])('rejects %s', async (_, overrides) => {
    await expect(withClaims(overrides).verifier.verify(TOKEN)).resolves.toBeNull()
  })

  it('rejects a token Supabase Auth does not accept', async () => {
    const { verifier } = verifierReturning({
      data: null,
      error: new AuthInvalidJwtError('Invalid JWT signature'),
    })
    await expect(verifier.verify(TOKEN)).resolves.toBeNull()
  })

  it('throws when Supabase Auth cannot be reached, so callers do not see a 401', async () => {
    const outage = new AuthRetryableFetchError('fetch failed', 0)
    await expect(
      verifierReturning({ data: null, error: outage }).verifier.verify(TOKEN)
    ).rejects.toBe(outage)
  })
})
