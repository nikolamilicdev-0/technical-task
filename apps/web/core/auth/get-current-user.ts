import 'server-only'

import type { JwtPayload } from '@supabase/supabase-js'
import { cache } from 'react'

import { createSupabaseServerClient } from '@/core/auth/server'
import type { CurrentUser } from '@/core/types'

function toCurrentUser(claims: JwtPayload): CurrentUser {
  return { id: claims.sub, email: claims.email ?? null }
}

/**
 * The signed-in user from verified JWT claims (never the unverified cookie session), or null.
 * Cached per request so layouts and pages share one verification.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data) return null
  return toCurrentUser(data.claims)
})
