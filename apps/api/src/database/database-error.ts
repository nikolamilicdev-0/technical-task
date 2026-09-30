import { HttpStatus } from '@nestjs/common'
import { PostgrestError } from '@supabase/supabase-js'

import { HTTP_SERVER_ERROR_MIN } from '../common/errors/error.constants.js'

// supabase-js reports a request that got no answer at all (network, DNS, timeout) as status 0.
const NO_RESPONSE_STATUS = 0
// A timed-out or rate-limited request (the API gateway sends both) may pass on the next try.
const TRANSIENT_CLIENT_STATUSES: ReadonlySet<number> = new Set([
  HttpStatus.REQUEST_TIMEOUT,
  HttpStatus.TOO_MANY_REQUESTS,
])

/** supabase-js returns failures as plain objects, whatever their type says; logs need an Error. */
export function toDatabaseError(error: PostgrestError): PostgrestError {
  return error instanceof PostgrestError ? error : new PostgrestError(error)
}

/** A failed PostgREST call with its HTTP status, which tells passing failures from lasting ones. */
export class DatabaseRequestError extends Error {
  override readonly name = 'DatabaseRequestError'
  readonly status: number
  /** The SQLSTATE or PGRST code; empty when no answer arrived. */
  readonly code: string

  constructor(error: PostgrestError, status: number) {
    super(error.message, { cause: toDatabaseError(error) })
    this.status = status
    this.code = error.code
  }

  /** No answer, a timeout, a rate limit or a server-side failure: a retry may succeed. */
  get transient(): boolean {
    return (
      this.status === NO_RESPONSE_STATUS ||
      TRANSIENT_CLIENT_STATUSES.has(this.status) ||
      this.status >= HTTP_SERVER_ERROR_MIN
    )
  }
}
