import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getPublicEnv } from '@/core/config/env'

let browserClient: SupabaseClient | undefined

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const env = getPublicEnv()
    browserClient = createBrowserClient(env.supabaseUrl, env.supabasePublishableKey)
  }
  return browserClient
}
