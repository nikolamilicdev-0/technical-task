import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

import type { NextConfig } from 'next'

const WORKSPACE_MARKER = 'pnpm-workspace.yaml'
const ROOT_ENV_FILE = '.env'

/** Loads the monorepo's single root `.env` (DEC-010); variables already set in the shell win. */
function loadRootEnv(startDir: string): void {
  for (let dir = startDir; ; dir = dirname(dir)) {
    if (existsSync(join(dir, WORKSPACE_MARKER))) {
      const envFile = join(dir, ROOT_ENV_FILE)
      if (existsSync(envFile)) process.loadEnvFile(envFile)
      return
    }
    if (dirname(dir) === dir) return
  }
}

loadRootEnv(process.cwd())

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep `next dev` from writing its own AGENTS.md / CLAUDE.md into the app.
  agentRules: false,
  transpilePackages: ['@kb/ui', '@kb/contracts'],
  // Derived here so the secret key can never be exposed under a public name.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
  },
}

export default nextConfig
