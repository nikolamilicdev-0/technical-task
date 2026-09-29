import { readFileSync } from 'node:fs'

import { apiErrorSchema, documentListSchema, documentSchema, MAX_UPLOAD_BYTES } from '@kb/contracts'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { AppModule } from '../../src/app.module.js'
import { configureHttp } from '../../src/app.setup.js'
import { JWT_VERIFIER } from '../../src/auth/auth.constants.js'
import type { JwtVerifier } from '../../src/auth/jwt-verifier.types.js'
import { APP_CONFIG } from '../../src/config/config.constants.js'
import { DocumentsRepository } from '../../src/modules/documents/documents.repository.js'
import {
  DOCUMENT_INGESTION_REQUESTED,
  type DocumentIngestionRequested,
} from '../../src/modules/ingestion/ingestion.events.js'
import { InMemoryDocumentsRepository } from '../fakes/in-memory-documents.repository.js'
import { buildTestConfig, TEST_USER } from '../fixtures.js'
import { TEST_DOCUMENT_ID } from '../fixtures/documents.js'

const TOKEN = 'token-documents'
const AUTH = { Authorization: `Bearer ${TOKEN}` }
const JSON_AUTH = { ...AUTH, 'Content-Type': 'application/json' }
const NEW_DOCUMENT = { title: 'Release notes', content: '# Shipped', tags: ['release'] }

const verify: JwtVerifier['verify'] = (token) =>
  Promise.resolve(token === TOKEN ? { userId: TEST_USER.id, email: TEST_USER.email } : null)
let app: NestExpressApplication
let baseUrl: string
let requested: DocumentIngestionRequested[] = []

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, init)
  const text = await response.text()
  const body: unknown = text === '' ? undefined : JSON.parse(text)
  return { response, body }
}

function createDocument() {
  return call('/documents', {
    method: 'POST',
    headers: JSON_AUTH,
    body: JSON.stringify(NEW_DOCUMENT),
  })
}

function upload(file: Blob, filename: string, fields: Record<string, string> = {}) {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) form.append(name, value)
  form.append('file', file, filename)
  return call('/documents/upload', { method: 'POST', headers: AUTH, body: form })
}

beforeAll(async () => {
  const config = buildTestConfig()
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .overrideProvider(JWT_VERIFIER)
    .useValue({ verify })
    .overrideProvider(DocumentsRepository)
    .useValue(new InMemoryDocumentsRepository())
    .compile()
  app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false })
  configureHttp(app, config)
  await app.listen(0, '127.0.0.1')
  baseUrl = await app.getUrl()
  app.get(EventEmitter2).on(DOCUMENT_INGESTION_REQUESTED, (event: DocumentIngestionRequested) => {
    requested.push(event)
  })
})

beforeEach(() => {
  requested = []
})

afterAll(async () => {
  await app.close()
})

describe('documents over HTTP', () => {
  it('creates a document with 201 and asks for its ingestion', async () => {
    const { response, body } = await createDocument()

    expect(response.status).toBe(201)
    const document = documentSchema.parse(body)
    expect(document).toMatchObject({ ...NEW_DOCUMENT, embeddingStatus: 'pending' })
    expect(requested).toEqual([{ documentId: document.id, userId: TEST_USER.id }])
  })

  it('rejects an invalid document with 422 and field errors', async () => {
    const { response, body } = await call('/documents', {
      method: 'POST',
      headers: JSON_AUTH,
      body: JSON.stringify({ title: ' ', tags: ['x'.repeat(41)] }),
    })

    expect(response.status).toBe(422)
    expect(Object.keys(apiErrorSchema.parse(body).errors ?? {}).sort()).toEqual([
      'content',
      'tags.0',
      'title',
    ])
  })

  it('lists documents with the requested window', async () => {
    await createDocument()

    const { response, body } = await call('/documents?limit=1&offset=0', { headers: AUTH })

    expect(response.status).toBe(200)
    const list = documentListSchema.parse(body)
    expect(list).toMatchObject({ limit: 1, offset: 0 })
    expect(list.items).toHaveLength(1)
    expect(list.total).toBeGreaterThanOrEqual(2)
  })

  it('rejects a list query out of range with 422', async () => {
    const { response, body } = await call('/documents?limit=0', { headers: AUTH })

    expect(response.status).toBe(422)
    expect(apiErrorSchema.parse(body).errors).toHaveProperty('limit')
  })

  it('reads, patches and deletes a document', async () => {
    const created = documentSchema.parse((await createDocument()).body)
    const item = `/documents/${created.id}`

    const read = await call(item, { headers: AUTH })
    const patched = await call(item, {
      method: 'PATCH',
      headers: JSON_AUTH,
      body: JSON.stringify({ tags: ['q3'] }),
    })
    const deleted = await call(item, { method: 'DELETE', headers: AUTH })
    const gone = await call(item, { headers: AUTH })

    expect(read.response.status).toBe(200)
    expect(documentSchema.parse(read.body).content).toBe(NEW_DOCUMENT.content)
    expect(patched.response.status).toBe(200)
    expect(documentSchema.parse(patched.body).tags).toEqual(['q3'])
    expect(deleted.response.status).toBe(204)
    expect(deleted.body).toBeUndefined()
    expect(gone.response.status).toBe(404)
  })

  it('asks for re-ingestion only when a patch changes the text', async () => {
    const created = documentSchema.parse((await createDocument()).body)
    requested = []
    const patch = (body: object) =>
      call(`/documents/${created.id}`, {
        method: 'PATCH',
        headers: JSON_AUTH,
        body: JSON.stringify(body),
      })

    await patch({ tags: ['only-tags'] })
    expect(requested).toEqual([])
    await patch({ content: '# Shipped again' })
    expect(requested).toEqual([{ documentId: created.id, userId: TEST_USER.id }])
  })

  it('answers 404 in the shared shape for a document that does not exist', async () => {
    const { response, body } = await call(`/documents/${TEST_DOCUMENT_ID}`, { headers: AUTH })

    expect(response.status).toBe(404)
    expect(body).toEqual({ code: 'not_found', messages: ['Document not found'] })
  })

  it('answers 422 for an id that is not a UUID', async () => {
    const { response, body } = await call('/documents/not-a-uuid', { headers: AUTH })

    expect(response.status).toBe(422)
    expect(apiErrorSchema.parse(body).errors).toHaveProperty('id')
  })

  it('requires a signed-in caller', async () => {
    const { response } = await call('/documents')

    expect(response.status).toBe(401)
  })
})

describe('uploads over HTTP', () => {
  it('creates a document from a Markdown file sent as octet-stream', async () => {
    const file = new Blob(['# Notes\r\n\r\nFrom a file'], { type: 'application/octet-stream' })

    const { response, body } = await upload(file, 'Meeting notes.md', { tags: 'meetings' })

    expect(response.status).toBe(201)
    const document = documentSchema.parse(body)
    expect(document).toMatchObject({
      title: 'Meeting notes',
      content: '# Notes\n\nFrom a file',
      tags: ['meetings'],
      sourceType: 'upload',
      sourceFilename: 'Meeting notes.md',
    })
    expect(requested).toEqual([{ documentId: document.id, userId: TEST_USER.id }])
  })

  it('keeps UTF-8 filenames intact', async () => {
    const { body } = await upload(new Blob(['Bonjour'], { type: 'text/plain' }), 'résumé.txt')

    expect(documentSchema.parse(body)).toMatchObject({
      title: 'résumé',
      sourceFilename: 'résumé.txt',
    })
  })

  it('answers 413 payload_too_large for a file over the upload limit', async () => {
    const file = new Blob([new Uint8Array(MAX_UPLOAD_BYTES + 1)], { type: 'text/plain' })

    const { response, body } = await upload(file, 'big.txt')

    expect(response.status).toBe(413)
    expect(apiErrorSchema.parse(body).code).toBe('payload_too_large')
  })

  it('answers 415 unsupported_media_type for other file types', async () => {
    const file = new Blob(['MZ'], { type: 'application/x-msdownload' })

    const { response, body } = await upload(file, 'setup.exe')

    expect(response.status).toBe(415)
    expect(apiErrorSchema.parse(body).code).toBe('unsupported_media_type')
  })

  it('answers 422 for a PDF without extractable text', async () => {
    const pdf = readFileSync(new URL('../fixtures/no-text.pdf', import.meta.url))

    const { response, body } = await upload(new Blob([pdf], { type: 'application/pdf' }), 'a.pdf')

    expect(response.status).toBe(422)
    expect(body).toEqual({
      code: 'invalid_payload',
      messages: ['The file contains no extractable text'],
    })
  })

  it('routes POST /documents/upload to uploads, never to a document id', async () => {
    const { response, body } = await call('/documents/upload', { method: 'POST', headers: AUTH })

    expect(response.status).toBe(422)
    expect(apiErrorSchema.parse(body).errors).toEqual({ file: ['A file is required'] })
  })
})
