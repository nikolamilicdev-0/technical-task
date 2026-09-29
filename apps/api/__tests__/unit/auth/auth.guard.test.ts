import { Controller, Get, type Type } from '@nestjs/common'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js'
import { Test } from '@nestjs/testing'
import { describe, expect, it, vi } from 'vitest'

import { JWT_VERIFIER } from '../../../src/auth/auth.constants.js'
import { AuthGuard } from '../../../src/auth/auth.guard.js'
import type { JwtVerifier } from '../../../src/auth/jwt-verifier.types.js'
import { Public } from '../../../src/common/auth/public.decorator.js'
import { ApiHttpException } from '../../../src/common/errors/api-http.exception.js'
import type { UserContext } from '../../../src/database/user-context.types.js'
import { SupabaseClientFactory } from '../../../src/database/supabase-client.factory.js'
import { TEST_USER } from '../../fixtures.js'

const TOKEN = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln'
const USER_DB = { scopedTo: TOKEN }

@Controller()
class DocumentsProbeController {
  @Get()
  list(this: void): void {}

  @Public()
  @Get('open')
  open(this: void): void {}
}

@Public()
@Controller()
class PublicProbeController {
  @Get()
  anything(this: void): void {}
}

interface ProbeRequest {
  headers: { authorization?: string }
  userContext?: UserContext
}

async function setup(verify: JwtVerifier['verify']) {
  const forUser = vi.fn(() => USER_DB)
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthGuard,
      { provide: JWT_VERIFIER, useValue: { verify } },
      { provide: SupabaseClientFactory, useValue: { forUser } },
    ],
  }).compile()
  return { guard: moduleRef.get(AuthGuard), forUser }
}

function contextFor(
  request: ProbeRequest,
  controller: Type<unknown> = DocumentsProbeController,
  handler: () => void = DocumentsProbeController.prototype.list
) {
  return new ExecutionContextHost([request, {}], controller, handler)
}

async function rejectionOf(promise: Promise<unknown>): Promise<ApiHttpException> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason
  )
  if (error instanceof ApiHttpException) return error
  throw new Error(`Expected an ApiHttpException, got ${String(error)}`)
}

describe('AuthGuard', () => {
  it('lets public routes and public controllers through without verifying anything', async () => {
    const verify = vi.fn<JwtVerifier['verify']>()
    const { guard } = await setup(verify)
    const request: ProbeRequest = { headers: {} }

    await expect(
      guard.canActivate(
        contextFor(request, DocumentsProbeController, DocumentsProbeController.prototype.open)
      )
    ).resolves.toBe(true)
    await expect(
      guard.canActivate(
        contextFor(request, PublicProbeController, PublicProbeController.prototype.anything)
      )
    ).resolves.toBe(true)
    expect(verify).not.toHaveBeenCalled()
    expect(request.userContext).toBeUndefined()
  })

  it.each([
    ['no Authorization header', {}],
    ['another scheme', { authorization: `Basic ${TOKEN}` }],
    ['an empty bearer', { authorization: 'Bearer ' }],
  ])('rejects %s with 401 before verifying', async (_, headers) => {
    const verify = vi.fn<JwtVerifier['verify']>()
    const { guard } = await setup(verify)

    const rejection = await rejectionOf(guard.canActivate(contextFor({ headers })))

    expect(rejection.getStatus()).toBe(401)
    expect(rejection.body).toEqual({ code: 'unauthenticated', messages: ['Missing bearer token'] })
    expect(verify).not.toHaveBeenCalled()
  })

  it('rejects a token the verifier does not accept with 401', async () => {
    const verify = vi.fn<JwtVerifier['verify']>().mockResolvedValue(null)
    const { guard, forUser } = await setup(verify)

    const rejection = await rejectionOf(
      guard.canActivate(contextFor({ headers: { authorization: `Bearer ${TOKEN}` } }))
    )

    expect(rejection.body).toEqual({
      code: 'unauthenticated',
      messages: ['Invalid or expired access token'],
    })
    expect(verify).toHaveBeenCalledWith(TOKEN)
    expect(forUser).not.toHaveBeenCalled()
  })

  it('lets a verification outage surface as itself, not as a 401', async () => {
    const outage = new Error('Auth unreachable')
    const { guard } = await setup(vi.fn<JwtVerifier['verify']>().mockRejectedValue(outage))

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: `Bearer ${TOKEN}` } }))
    ).rejects.toBe(outage)
  })

  it('attaches the verified user and a client scoped to their token', async () => {
    const verify = vi
      .fn<JwtVerifier['verify']>()
      .mockResolvedValue({ userId: TEST_USER.id, email: TEST_USER.email })
    const { guard, forUser } = await setup(verify)
    const request: ProbeRequest = { headers: { authorization: `Bearer ${TOKEN}` } }

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true)

    expect(forUser).toHaveBeenCalledWith(TOKEN)
    expect(request.userContext).toEqual({
      userId: TEST_USER.id,
      email: TEST_USER.email,
      db: USER_DB,
    })
  })
})
