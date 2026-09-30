import { Reflector } from '@nestjs/core'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js'
import { ThrottlerStorageService } from '@nestjs/throttler'
import { describe, expect, it, vi } from 'vitest'

import { ApiHttpException } from '../../../src/common/errors/api-http.exception.js'
import { RateLimitBucket } from '../../../src/throttling/rate-limit-bucket.decorator.js'
import { UserThrottlerGuard } from '../../../src/throttling/user-throttler.guard.js'
import { buildTestConfig } from '../../fixtures.js'

const DEFAULT_LIMIT = 4
const CHAT_LIMIT = 2

class RoutesUnderTest {
  @RateLimitBucket('chat')
  send(this: void): void {}

  list(this: void): void {}
}

async function guardWithLimits(): Promise<UserThrottlerGuard> {
  const guard = new UserThrottlerGuard(
    { throttlers: [{ name: 'default', ttl: 60_000, limit: DEFAULT_LIMIT }] },
    new ThrottlerStorageService(),
    new Reflector(),
    buildTestConfig({ RATE_LIMIT_CHAT_PER_MINUTE: String(CHAT_LIMIT) })
  )
  await guard.onModuleInit()
  return guard
}

function contextFor(handler: () => void, userId: string) {
  const request = { userContext: { userId }, ip: '127.0.0.1', headers: {} }
  const response = { header: vi.fn() }
  return new ExecutionContextHost([request, response], RoutesUnderTest, handler)
}

/** How many requests pass before the guard answers 429. */
async function allowedRequests(guard: UserThrottlerGuard, handler: () => void, userId: string) {
  for (let passed = 0; ; passed += 1) {
    const allowed = await guard.canActivate(contextFor(handler, userId)).catch((error: unknown) => {
      if (error instanceof ApiHttpException && error.body.code === 'rate_limited') return false
      throw error
    })
    if (!allowed) return passed
  }
}

describe('UserThrottlerGuard', () => {
  it('limits a bucketed route by its configured limit and other routes by the default', async () => {
    const guard = await guardWithLimits()
    const routes = RoutesUnderTest.prototype

    await expect(allowedRequests(guard, routes.send, 'chatty')).resolves.toBe(CHAT_LIMIT)
    await expect(allowedRequests(guard, routes.list, 'chatty')).resolves.toBe(DEFAULT_LIMIT)
  })

  it('counts every user separately', async () => {
    const guard = await guardWithLimits()
    const { send } = RoutesUnderTest.prototype

    await expect(allowedRequests(guard, send, 'first')).resolves.toBe(CHAT_LIMIT)
    await expect(allowedRequests(guard, send, 'second')).resolves.toBe(CHAT_LIMIT)
  })

  it('answers 429 with a retry hint in seconds', async () => {
    const guard = await guardWithLimits()
    const { send } = RoutesUnderTest.prototype
    await allowedRequests(guard, send, 'hint')

    const error: unknown = await guard
      .canActivate(contextFor(send, 'hint'))
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiHttpException)
    expect((error as ApiHttpException).body).toEqual({
      code: 'rate_limited',
      messages: ['Too many requests; try again shortly'],
      retryAfter: 60,
    })
  })
})
