import { getSupabaseBrowserClient } from '@/core/auth/client'

/** The current access token; Supabase refreshes it first when it is about to expire. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabaseBrowserClient().auth.getSession()
  return data.session?.access_token ?? null
}
