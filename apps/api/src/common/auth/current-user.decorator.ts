import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

import type { UserContext } from '../../database/user-context.types.js'
import type { ApiRequest } from '../types/request.types.js'

/** The verified caller: `userId`, `email` and the `db` client scoped to them by RLS. */
export const CurrentUser = createParamDecorator<undefined, UserContext>(
  (_data, context: ExecutionContext) => {
    const { userContext } = context.switchToHttp().getRequest<ApiRequest>()
    if (userContext === undefined) {
      throw new Error('@CurrentUser() needs a route the AuthGuard protects (not @Public())')
    }
    return userContext
  }
)
