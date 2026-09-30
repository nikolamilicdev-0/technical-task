import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { getPublicEnv } from '@/core/config/env'

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const env = getPublicEnv()
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot write cookies; proxy.ts already refreshed the session.
        }
      },
    },
  })
}
