import { getSupabaseBrowserClient } from '@/core/auth/client'

/** Ends the browser session; throws when Supabase rejects the request. */
export async function signOut(): Promise<void> {
  const { error } = await getSupabaseBrowserClient().auth.signOut()
  if (error) throw error
}
