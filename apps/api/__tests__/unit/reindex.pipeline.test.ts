import { apiErrorSchema, reindexResultSchema } from '@kb/contracts'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../../src/app.module.js'
import { configureHttp } from '../../src/app.setup.js'
import { JWT_VERIFIER } from '../../src/auth/auth.constants.js'
import type { JwtVerifier } from '../../src/auth/jwt-verifier.types.js'
import { APP_CONFIG } from '../../src/config/config.constants.js'
import { DocumentsRepository } from '../../src/modules/documents/documents.repository.js'
import { IngestionRepository } from '../../src/modules/ingestion/ingestion.repository.js'
import { InMemoryDocumentsRepository } from '../fakes/in-memory-documents.repository.js'
import { InMemoryIngestionRepository } from '../fakes/in-memory-ingestion.repository.js'
import { buildTestConfig } from '../fixtures.js'
import { TEST_DOCUMENT_ID } from '../fixtures/documents.js'

const FOREIGN_DOCUMENT_ID = '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5f'
// Limits count per user and route, so every test signs in as a user of its own.
const users = new Map<string, string>()
const verify: JwtVerifier['verify'] = (token) => {
  const userId = users.get(token)
  return Promise.resolve(userId === undefined ? null : { userId })
}
let app: NestExpressApplication
let baseUrl: string

function signIn(userId: string): Record<string, string> {
  const token = `token-${userId}`
  users.set(token, userId)
  return { Authorization: `Bearer ${token}` }
}

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, { method: 'POST', ...init })
  const text = await response.text()
  const body: unknown = text === '' ? undefined : JSON.parse(text)
  return { response, body }
}

beforeAll(async () => {
  const config = buildTestConfig()
  const ingestion = new InMemoryIngestionRepository()
  ingestion.contentHashes.set(TEST_DOCUMENT_ID, 'hash')
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .overrideProvider(JWT_VERIFIER)
    .useValue({ verify })
    .overrideProvider(DocumentsRepository)
    .useValue(new InMemoryDocumentsRepository())
    .overrideProvider(IngestionRepository)
    .useValue(ingestion)
    .compile()
  app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false })
  configureHttp(app, config)
  await app.listen(0, '127.0.0.1')
  baseUrl = await app.getUrl()
})

afterAll(async () => {
  await app.close()
})

describe('reindex over HTTP', () => {
  it('re-queues every document of the caller with 200 and the queued count', async () => {
    const { response, body } = await call('/documents/reindex-all', { headers: signIn('all') })

    expect(response.status).toBe(200)
    expect(reindexResultSchema.parse(body)).toEqual({ queued: 1 })
  })

  it('re-queues one document of the caller', async () => {
    const { response, body } = await call(`/documents/${TEST_DOCUMENT_ID}/reindex`, {
      headers: signIn('one'),
    })

    expect(response.status).toBe(200)
    expect(body).toEqual({ queued: 1 })
  })

  it('answers 404 for a document the caller cannot see and 422 for a malformed id', async () => {
    const headers = signIn('missing')

    const foreign = await call(`/documents/${FOREIGN_DOCUMENT_ID}/reindex`, { headers })
    const malformed = await call('/documents/not-a-uuid/reindex', { headers })

    expect(foreign.response.status).toBe(404)
    expect(foreign.body).toEqual({ code: 'not_found', messages: ['Document not found'] })
    expect(malformed.response.status).toBe(422)
    expect(apiErrorSchema.parse(malformed.body).errors).toHaveProperty('id')
  })

  it('requires a signed-in caller', async () => {
    const all = await call('/documents/reindex-all')
    const one = await call(`/documents/${TEST_DOCUMENT_ID}/reindex`)

    expect([all.response.status, one.response.status]).toEqual([401, 401])
    expect(apiErrorSchema.parse(all.body).code).toBe('unauthenticated')
  })

  it('allows three requests a minute, then answers 429 with a retry hint', async () => {
    const headers = signIn('throttled')

    const statuses: number[] = []
    for (let attempt = 0; attempt < 3; attempt += 1) {
      statuses.push((await call('/documents/reindex-all', { headers })).response.status)
    }
    const { response, body } = await call('/documents/reindex-all', { headers })

    expect(statuses).toEqual([200, 200, 200])
    expect(response.status).toBe(429)
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(apiErrorSchema.parse(body)).toMatchObject({ code: 'rate_limited' })
  })

  it('leaves GET /documents/:id to the documents routes', async () => {
    const { response, body } = await call('/documents/reindex-all', {
      method: 'GET',
      headers: signIn('reader'),
    })

    expect(response.status).toBe(422)
    expect(apiErrorSchema.parse(body).errors).toHaveProperty('id')
  })
})
