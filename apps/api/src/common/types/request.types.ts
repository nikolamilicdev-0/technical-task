import type { Request } from 'express'

import type { UserContext } from '../../database/user-context.types.js'

export interface ApiRequest extends Request {
  /** Set by `assignRequestId`, the first middleware. */
  requestId?: string
  /** Set by the AuthGuard on every route that is not `@Public()`. */
  userContext?: UserContext
}
