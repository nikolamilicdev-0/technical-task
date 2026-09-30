import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import type { UserContext } from '../../../../src/database/user-context.types.js'
import { DocumentsRepository } from '../../../../src/modules/documents/documents.repository.js'
import { DocumentsService } from '../../../../src/modules/documents/documents.service.js'
import {
  DOCUMENT_INGESTION_REQUESTED,
  type DocumentIngestionRequested,
} from '../../../../src/modules/ingestion/ingestion.events.js'
import { InMemoryDocumentsRepository } from '../../../fakes/in-memory-documents.repository.js'
import { TEST_USER } from '../../../fixtures.js'
import { TEST_DOCUMENT_ID } from '../../../fixtures/documents.js'

const USER: UserContext = {
  userId: TEST_USER.id,
  email: TEST_USER.email,
  db: { scopedTo: TEST_USER.id } as unknown as DatabaseClient,
}
const INPUT = { title: 'Release notes', content: '# Shipped', tags: ['release'] }

let service: DocumentsService
let repository: InMemoryDocumentsRepository
let requested: DocumentIngestionRequested[]

beforeEach(async () => {
  repository = new InMemoryDocumentsRepository()
  const events = new EventEmitter2()
  requested = []
  events.on(DOCUMENT_INGESTION_REQUESTED, (event: DocumentIngestionRequested) => {
    requested.push(event)
  })
  const moduleRef = await Test.createTestingModule({
    providers: [
      DocumentsService,
      { provide: DocumentsRepository, useValue: repository },
      { provide: EventEmitter2, useValue: events },
    ],
  }).compile()
  service = moduleRef.get(DocumentsService)
})

async function notFoundFrom(promise: Promise<unknown>): Promise<ApiHttpException> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason
  )
  if (error instanceof ApiHttpException) return error
  throw new Error(`Expected an ApiHttpException, got ${String(error)}`)
}

describe('DocumentsService', () => {
  it('lists through the RLS-scoped client of the caller and echoes the window', async () => {
    const list = vi.spyOn(repository, 'list')
    await service.create(USER, INPUT)

    const result = await service.list(USER, { limit: 5, offset: 0 })

    expect(list).toHaveBeenCalledWith(USER.db, { limit: 5, offset: 0 })
    expect(result).toMatchObject({ total: 1, limit: 5, offset: 0 })
    expect(result.items).toHaveLength(1)
  })

  describe('create', () => {
    it('stores an editor document and asks for its ingestion', async () => {
      const document = await service.create(USER, INPUT)

      expect(document).toMatchObject({ ...INPUT, sourceType: 'editor', sourceFilename: null })
      expect(requested).toEqual([{ documentId: document.id, userId: TEST_USER.id }])
    })

    it('keeps the source of an upload', async () => {
      const document = await service.create(USER, INPUT, { type: 'upload', filename: 'notes.md' })

      expect(document).toMatchObject({ sourceType: 'upload', sourceFilename: 'notes.md' })
    })
  })

  describe('update', () => {
    it.each([
      ['the content', { content: '# Shipped twice' }],
      ['the title', { title: 'Renamed' }],
    ])('asks for re-ingestion when %s changes', async (_, patch) => {
      const { id } = await service.create(USER, INPUT)
      requested.length = 0

      const document = await service.update(USER, id, patch)

      expect(document).toMatchObject(patch)
      expect(requested).toEqual([{ documentId: id, userId: TEST_USER.id }])
    })

    it('leaves ingestion alone when only the tags change', async () => {
      const { id } = await service.create(USER, INPUT)
      requested.length = 0

      const document = await service.update(USER, id, { tags: ['q3'] })

      expect(document.tags).toEqual(['q3'])
      expect(requested).toEqual([])
    })

    it('answers 404 for a document the caller cannot see, without an event', async () => {
      const error = await notFoundFrom(service.update(USER, TEST_DOCUMENT_ID, { content: 'x' }))

      expect(error.getStatus()).toBe(404)
      expect(error.body).toEqual({ code: 'not_found', messages: ['Document not found'] })
      expect(requested).toEqual([])
    })
  })

  describe('get and remove', () => {
    it('returns a visible document and deletes it', async () => {
      const { id } = await service.create(USER, INPUT)

      await expect(service.get(USER, id)).resolves.toMatchObject({ id, content: INPUT.content })
      await expect(service.remove(USER, id)).resolves.toBeUndefined()
      expect((await notFoundFrom(service.get(USER, id))).getStatus()).toBe(404)
    })

    it('answers 404 when deleting a document that is not there', async () => {
      const error = await notFoundFrom(service.remove(USER, TEST_DOCUMENT_ID))

      expect(error.body.code).toBe('not_found')
    })
  })
})
