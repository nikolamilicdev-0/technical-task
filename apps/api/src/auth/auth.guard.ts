import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { IS_PUBLIC_KEY } from '../common/auth/public.decorator.js'
import { ApiHttpException } from '../common/errors/api-http.exception.js'
import type { ApiRequest } from '../common/types/request.types.js'
import { SupabaseClientFactory } from '../database/supabase-client.factory.js'
import { INVALID_TOKEN_MESSAGE, JWT_VERIFIER, MISSING_TOKEN_MESSAGE } from './auth.constants.js'
import { extractBearerToken } from './bearer-token.js'
import type { JwtVerifier } from './jwt-verifier.types.js'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(JWT_VERIFIER) private readonly verifier: JwtVerifier,
    private readonly clients: SupabaseClientFactory
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.#isPublic(context)) return true
    const request = context.switchToHttp().getRequest<ApiRequest>()
    const token = extractBearerToken(request.headers.authorization)
    if (token === undefined) throw new ApiHttpException('unauthenticated', [MISSING_TOKEN_MESSAGE])
    const user = await this.verifier.verify(token)
    if (user === null) throw new ApiHttpException('unauthenticated', [INVALID_TOKEN_MESSAGE])
    request.userContext = { ...user, db: this.clients.forUser(token) }
    return true
  }

  #isPublic(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()]
    return this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets) === true
  }
}
