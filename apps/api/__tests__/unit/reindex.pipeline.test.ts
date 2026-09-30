import { apiErrorSchema, reindexResultSchema } from '@kb/contracts'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DocumentsRepository } from '../../src/modules/documents/documents.repository.js'
import { IngestionRepository } from '../../src/modules/ingestion/ingestion.repository.js'
import { InMemoryDocumentsRepository } from '../fakes/in-memory-documents.repository.js'
import { InMemoryIngestionRepository } from '../fakes/in-memory-ingestion.repository.js'
import { TestApp } from '../fakes/test-app.js'
import { TEST_DOCUMENT_ID } from '../fixtures/documents.js'

const FOREIGN_DOCUMENT_ID = '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5f'
let api: TestApp

function post(path: string, init: RequestInit = {}) {
  return api.call(path, { method: 'POST', ...init })
}

beforeAll(async () => {
  const ingestion = new InMemoryIngestionRepository()
  ingestion.contentHashes.set(TEST_DOCUMENT_ID, 'hash')
  api = await TestApp.start((builder) =>
    builder
      .overrideProvider(DocumentsRepository)
      .useValue(new InMemoryDocumentsRepository())
      .overrideProvider(IngestionRepository)
      .useValue(ingestion)
  )
})

afterAll(async () => {
  await api.close()
})

describe('reindex over HTTP', () => {
  it('re-queues every document of the caller with 200 and the queued count', async () => {
    const { response, body } = await post('/documents/reindex-all', { headers: api.signIn('all') })

    expect(response.status).toBe(200)
    expect(reindexResultSchema.parse(body)).toEqual({ queued: 1 })
  })

  it('re-queues one document of the caller', async () => {
    const { response, body } = await post(`/documents/${TEST_DOCUMENT_ID}/reindex`, {
      headers: api.signIn('one'),
    })

    expect(response.status).toBe(200)
    expect(body).toEqual({ queued: 1 })
  })

  it('answers 404 for a document the caller cannot see and 422 for a malformed id', async () => {
    const headers = api.signIn('missing')

    const foreign = await post(`/documents/${FOREIGN_DOCUMENT_ID}/reindex`, { headers })
    const malformed = await post('/documents/not-a-uuid/reindex', { headers })

    expect(foreign.response.status).toBe(404)
    expect(foreign.body).toEqual({ code: 'not_found', messages: ['Document not found'] })
    expect(malformed.response.status).toBe(422)
    expect(apiErrorSchema.parse(malformed.body).errors).toHaveProperty('id')
  })

  it('requires a signed-in caller', async () => {
    const all = await post('/documents/reindex-all')
    const one = await post(`/documents/${TEST_DOCUMENT_ID}/reindex`)

    expect([all.response.status, one.response.status]).toEqual([401, 401])
    expect(apiErrorSchema.parse(all.body).code).toBe('unauthenticated')
  })

  it('allows three requests a minute, then answers 429 with a retry hint', async () => {
    const headers = api.signIn('throttled')

    const statuses: number[] = []
    for (let attempt = 0; attempt < 3; attempt += 1) {
      statuses.push((await post('/documents/reindex-all', { headers })).response.status)
    }
    const { response, body } = await post('/documents/reindex-all', { headers })

    expect(statuses).toEqual([200, 200, 200])
    expect(response.status).toBe(429)
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(apiErrorSchema.parse(body)).toMatchObject({ code: 'rate_limited' })
  })

  it('leaves GET /documents/:id to the documents routes', async () => {
    const { response, body } = await api.call('/documents/reindex-all', {
      headers: api.signIn('reader'),
    })

    expect(response.status).toBe(422)
    expect(apiErrorSchema.parse(body).errors).toHaveProperty('id')
  })
})
