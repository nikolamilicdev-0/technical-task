import { Inject, Injectable } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'

import type { AppConfig, SupabaseSettings } from '../config/app-config.types.js'
import { APP_CONFIG } from '../config/config.constants.js'
import type { DatabaseClient } from './database-client.types.js'
import { STATELESS_AUTH } from './database.constants.js'
import type { Database } from './database.types.js'

/** The three kinds of Supabase clients; RLS governs all of them except `serviceRole()` (DEC-004). */
@Injectable()
export class SupabaseClientFactory {
  readonly #settings: SupabaseSettings
  readonly #serviceRole: DatabaseClient
  readonly #anonymous: DatabaseClient

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const { url, publishableKey, secretKey } = config.supabase
    this.#settings = config.supabase
    this.#serviceRole = createClient<Database>(url, secretKey, { auth: STATELESS_AUTH })
    this.#anonymous = createClient<Database>(url, publishableKey, { auth: STATELESS_AUTH })
  }

  /** Acts as the caller, so their RLS policies apply to every query; cheap to build per request. */
  forUser(accessToken: string): DatabaseClient {
    const { url, publishableKey } = this.#settings
    return createClient<Database>(url, publishableKey, {
      auth: STATELESS_AUTH,
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })
  }

  /** Bypasses RLS: reserved for the ingestion worker, the usage recorder and the readiness probe. */
  serviceRole(): DatabaseClient {
    return this.#serviceRole
  }

  /** No session at all; verifies access tokens and keeps the JWKS cached between requests. */
  anonymous(): DatabaseClient {
    return this.#anonymous
  }
}
