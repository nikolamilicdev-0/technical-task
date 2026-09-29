import type { JwtPayload } from '@supabase/supabase-js'

import { loadAppConfig } from '../src/config/app-config.js'
import type { AppConfig } from '../src/config/app-config.types.js'

/** The smallest environment the API boots with; AI stays unconfigured. */
export const TEST_ENV = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
} as const

export const TEST_OPENAI_KEY = 'sk-test'

export function buildTestConfig(env: Readonly<Record<string, string>> = {}): AppConfig {
  return loadAppConfig({ ...TEST_ENV, ...env })
}

export const TEST_USER = {
  id: '6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b',
  email: 'phase4@example.com',
} as const

const ISSUED_AT = 1_790_000_000
const LIFETIME_SECONDS = 3_600

/** Claims of a Supabase user access token. */
export function buildClaims(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    iss: 'http://127.0.0.1:54321/auth/v1',
    sub: TEST_USER.id,
    aud: 'authenticated',
    exp: ISSUED_AT + LIFETIME_SECONDS,
    iat: ISSUED_AT,
    role: 'authenticated',
    aal: 'aal1',
    session_id: '0b9d2c4e-8f1a-4c3b-9d5e-7a6f8e9d0c1b',
    email: TEST_USER.email,
    ...overrides,
  }
}
