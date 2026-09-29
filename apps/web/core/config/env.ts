import { z } from 'zod'

const publicEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_API_URL: z.url(),
  })
  .transform((env) => ({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    apiUrl: env.NEXT_PUBLIC_API_URL,
  }))

export type PublicEnv = z.infer<typeof publicEnvSchema>

let publicEnv: PublicEnv | undefined

/** Browser-safe settings, validated on first use so `next build` succeeds without a `.env`. */
export function getPublicEnv(): PublicEnv {
  if (publicEnv) return publicEnv
  // Each key is read literally: Next only inlines statically visible NEXT_PUBLIC_* references.
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  })
  if (!result.success) {
    throw new Error(
      `Invalid web environment (set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and NEXT_PUBLIC_API_URL in the root .env):\n${z.prettifyError(result.error)}`
    )
  }
  publicEnv = result.data
  return publicEnv
}
