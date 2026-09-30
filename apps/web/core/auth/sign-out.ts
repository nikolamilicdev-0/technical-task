import { getSupabaseBrowserClient } from '@/core/auth/client'

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseBrowserClient().auth.signOut()
  if (error) throw error
}
