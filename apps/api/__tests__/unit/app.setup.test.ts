import {
  apiErrorSchema,
  type CreateDocumentInput,
  createDocumentSchema,
  healthSchema,
} from '@kb/contracts'
import { Controller, Get, Post } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { AppModule } from '../../src/app.module.js'
import { configureHttp } from '../../src/app.setup.js'
import { JWT_VERIFIER } from '../../src/auth/auth.constants.js'
import type { JwtVerifier, VerifiedUser } from '../../src/auth/jwt-verifier.types.js'
import { CurrentUser } from '../../src/common/auth/current-user.decorator.js'
import { Public } from '../../src/common/auth/public.decorator.js'
import { ZodBody } from '../../src/common/validation/zod-params.decorators.js'
import { APP_CONFIG } from '../../src/config/config.constants.js'
import { VECTOR_DIMENSIONS } from '../../src/database/database.constants.js'
import type { UserContext } from '../../src/database/user-context.types.js'
import { HealthRepository } from '../../src/modules/health/health.repository.js'
import { buildTestConfig, TEST_USER } from '../fixtures.js'

const RATE_LIMIT = 5
const WEB_ORIGIN = 'http://localhost:3000'
const JSON_HEADERS = { 'Content-Type': 'application/json' }
const OVERSIZED_CONTENT = 'x'.repeat(2 * 1024 * 1024)
const USERS = new Map<string, VerifiedUser>([
  ['token-a', { userId: TEST_USER.id, email: TEST_USER.email }],
  ['token-throttled', { userId: '1d2e3f4a-5b6c-4d7e-8f90-a1b2c3d4e5f6' }],
])

@Controller('probe')
class ProbeController {
  @Get('me')
  me(@CurrentUser() user: UserContext): { userId: string } {
    return { userId: user.userId }
  }

  @Public()
  @Post('documents')
  create(@ZodBody(createDocumentSchema) input: CreateDocumentInput): CreateDocumentInput {
    return input
  }
}

const verify = vi.fn<JwtVerifier['verify']>((token) => Promise.resolve(USERS.get(token) ?? null))
const embeddingColumnDimensions = vi.fn<HealthRepository['embeddingColumnDimensions']>()
let app: NestExpressApplication
let baseUrl: string

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, init)
  const text = await response.text()
  const body: unknown = text === '' ? undefined : JSON.parse(text)
  return { response, body }
}

function bearer(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } }
}

beforeAll(async () => {
  const config = buildTestConfig({ RATE_LIMIT_DEFAULT_PER_MINUTE: String(RATE_LIMIT), WEB_ORIGIN })
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProbeController],
  })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .overrideProvider(JWT_VERIFIER)
    .useValue({ verify })
    .overrideProvider(HealthRepository)
    .useValue({ embeddingColumnDimensions })
    .compile()
  app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false })
  configureHttp(app, config)
  await app.listen(0, '127.0.0.1')
  baseUrl = await app.getUrl()
})

afterAll(async () => {
  await app.close()
})

describe('HTTP pipeline', () => {
  describe('health', () => {
    it('answers liveness publicly under the /api prefix', async () => {
      const { response, body } = await call('/health')

      expect(response.status).toBe(200)
      expect(healthSchema.parse(body).status).toBe('ok')
    })

    it('reports readiness, with AI unconfigured but not blocking', async () => {
      embeddingColumnDimensions.mockResolvedValueOnce(VECTOR_DIMENSIONS)
      const { response, body } = await call('/health/ready')

      expect(response.status).toBe(200)
      expect(body).toEqual({
        status: 'ok',
        checks: { database: 'ok', embeddingDimensions: 'ok', ai: 'unconfigured' },
      })
    })

    it('answers 503 while the column size or the database is off', async () => {
      embeddingColumnDimensions.mockResolvedValueOnce(768)
      const mismatch = await call('/health/ready')
      embeddingColumnDimensions.mockRejectedValueOnce(new Error('statement timeout'))
      const unreachable = await call('/health/ready')

      expect(mismatch.response.status).toBe(503)
      expect(mismatch.body).toMatchObject({ checks: { embeddingDimensions: 'mismatch' } })
      expect(unreachable.response.status).toBe(503)
      expect(unreachable.body).toMatchObject({ checks: { database: 'error' } })
    })
  })

  it('answers unknown routes with 404 in the shared error shape', async () => {
    const { response, body } = await call('/nope')

    expect(response.status).toBe(404)
    expect(apiErrorSchema.parse(body)).toEqual({
      code: 'not_found',
      messages: ['Cannot GET /api/nope'],
    })
  })

  it('tags every response with a request id, keeping a well-formed upstream one', async () => {
    const minted = await call('/nope')
    const forwarded = await call('/health', { headers: { 'X-Request-Id': 'trace-42' } })

    expect(minted.response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(forwarded.response.headers.get('x-request-id')).toBe('trace-42')
  })

  describe('authentication', () => {
    it('rejects a guarded route without a token', async () => {
      const { response, body } = await call('/probe/me')

      expect(response.status).toBe(401)
      expect(body).toEqual({ code: 'unauthenticated', messages: ['Missing bearer token'] })
    })

    it('rejects a token the verifier does not accept', async () => {
      const { response, body } = await call('/probe/me', bearer('forged'))

      expect(response.status).toBe(401)
      expect(body).toEqual({
        code: 'unauthenticated',
        messages: ['Invalid or expired access token'],
      })
    })

    it('hands the verified caller to the route', async () => {
      const { response, body } = await call('/probe/me', bearer('token-a'))

      expect(response.status).toBe(200)
      expect(body).toEqual({ userId: TEST_USER.id })
    })
  })

  describe('request bodies', () => {
    it('parses a valid body with the contracts schema', async () => {
      const init = { method: 'POST', headers: JSON_HEADERS }
      const { response, body } = await call('/probe/documents', {
        ...init,
        body: JSON.stringify({ title: ' Guide ', content: 'Body', ignored: true }),
      })

      expect(response.status).toBe(201)
      expect(body).toEqual({ title: 'Guide', content: 'Body', tags: [] })
    })

    it('rejects an invalid body with 422 and per-field errors', async () => {
      const { response, body } = await call('/probe/documents', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ title: '' }),
      })

      expect(response.status).toBe(422)
      const error = apiErrorSchema.parse(body)
      expect(error.code).toBe('invalid_payload')
      expect(Object.keys(error.errors ?? {}).sort()).toEqual(['content', 'title'])
    })

    it('rejects malformed JSON with 422 invalid_payload', async () => {
      const { response, body } = await call('/probe/documents', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: '{"title": ',
      })

      expect(response.status).toBe(422)
      expect(apiErrorSchema.parse(body).code).toBe('invalid_payload')
    })

    it('rejects a body over the JSON limit with 413', async () => {
      const { response, body } = await call('/probe/documents', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ title: 'Big', content: OVERSIZED_CONTENT }),
      })

      expect(response.status).toBe(413)
      expect(apiErrorSchema.parse(body).code).toBe('payload_too_large')
    })
  })

  it('rate-limits per user and says when to retry', async () => {
    const responses = []
    for (let attempt = 0; attempt <= RATE_LIMIT; attempt += 1) {
      responses.push(await call('/probe/me', bearer('token-throttled')))
    }
    const limited = responses.at(-1)

    expect(responses.slice(0, RATE_LIMIT).map(({ response }) => response.status)).toEqual(
      Array.from({ length: RATE_LIMIT }, () => 200)
    )
    expect(limited?.response.status).toBe(429)
    const error = apiErrorSchema.parse(limited?.body)
    expect(error.code).toBe('rate_limited')
    expect(error.retryAfter).toBeGreaterThan(0)
    expect(limited?.response.headers.get('retry-after')).toBe(String(error.retryAfter))
  })

  describe('CORS', () => {
    it('admits preflight requests from the web origin', async () => {
      const { response } = await call('/probe/me', {
        method: 'OPTIONS',
        headers: {
          Origin: WEB_ORIGIN,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      })

      expect(response.status).toBe(204)
      expect(response.headers.get('access-control-allow-origin')).toBe(WEB_ORIGIN)
      expect(response.headers.get('access-control-allow-headers')).toBe(
        'Authorization,Content-Type,Accept'
      )
      expect(response.headers.get('access-control-allow-credentials')).toBeNull()
    })

    it('exposes Retry-After to the web app and ignores other origins', async () => {
      const fromWeb = await call('/health', { headers: { Origin: WEB_ORIGIN } })
      const fromElsewhere = await call('/health', { headers: { Origin: 'https://evil.example' } })

      expect(fromWeb.response.headers.get('access-control-expose-headers')).toBe('Retry-After')
      expect(fromElsewhere.response.headers.get('access-control-allow-origin')).not.toBe(
        'https://evil.example'
      )
    })
  })
})
