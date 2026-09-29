import { getSupabaseBrowserClient } from '@/core/auth/client'
import type { LoginValues, SignupResult, SignupValues } from '@/features/auth/types'

/** Supabase Auth calls from the browser; failures are thrown as Supabase AuthErrors. */
export const authService = {
  async signIn({ email, password }: LoginValues): Promise<void> {
    const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  },

  async signUp({ email, password }: SignupValues): Promise<SignupResult> {
    const { data, error } = await getSupabaseBrowserClient().auth.signUp({ email, password })
    if (error) throw error
    return data.session ? { status: 'signedIn' } : { status: 'confirmationRequired', email }
  },
}
