import type { DatabaseClient } from './database-client.types.js'

export interface UserContext {
  readonly userId: string
  readonly email?: string
  /** Acts as the caller, so row-level security decides what every query can see. */
  readonly db: DatabaseClient
}
