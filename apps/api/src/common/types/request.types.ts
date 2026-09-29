import type { Request } from 'express'

import type { UserContext } from '../../database/user-context.types.js'

/** An Express request with the fields this API attaches to it. */
export interface ApiRequest extends Request {
  /** Set by `assignRequestId`, the first middleware. */
  requestId?: string
  /** Set by the AuthGuard on every route that is not `@Public()`. */
  userContext?: UserContext
}

/** A request that passed the AuthGuard. */
export interface AuthenticatedRequest extends ApiRequest {
  userContext: UserContext
}
