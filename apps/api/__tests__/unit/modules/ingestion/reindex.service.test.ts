import { Test } from '@nestjs/testing'
import { describe, expect, it, vi } from 'vitest'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import type { UserContext } from '../../../../src/database/user-context.types.js'
import { IngestionRepository } from '../../../../src/modules/ingestion/ingestion.repository.js'
import { IngestionWorker } from '../../../../src/modules/ingestion/ingestion.worker.js'
import { ReindexService } from '../../../../src/modules/ingestion/reindex.service.js'
import { InMemoryIngestionRepository } from '../../../fakes/in-memory-ingestion.repository.js'
import { TEST_USER } from '../../../fixtures.js'
import { TEST_DOCUMENT_ID } from '../../../fixtures/documents.js'

const USER: UserContext = {
  userId: TEST_USER.id,
  db: { scopedTo: TEST_USER.id } as unknown as DatabaseClient,
}
const OTHER_DOCUMENT_ID = '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5f'

async function setup() {
  const repository = new InMemoryIngestionRepository()
  repository.contentHashes.set(TEST_DOCUMENT_ID, 'hash')
  const wake = vi.fn(() => Promise.resolve())
  const moduleRef = await Test.createTestingModule({
    providers: [
      ReindexService,
      { provide: IngestionRepository, useValue: repository },
      { provide: IngestionWorker, useValue: { wake } },
    ],
  }).compile()
  return { service: moduleRef.get(ReindexService), repository, wake }
}

describe('ReindexService', () => {
  it('re-queues every document of the caller through their client and wakes the worker', async () => {
    const { service, repository, wake } = await setup()
    const requeue = vi.spyOn(repository, 'requeueDocuments')

    await expect(service.reindexAll(USER)).resolves.toEqual({ queued: 1 })
    expect(requeue).toHaveBeenCalledWith(USER.db)
    expect(wake).toHaveBeenCalledOnce()
  })

  it('re-queues one document of the caller', async () => {
    const { service, repository, wake } = await setup()
    const requeue = vi.spyOn(repository, 'requeueDocuments')

    await expect(service.reindexDocument(USER, TEST_DOCUMENT_ID)).resolves.toEqual({ queued: 1 })
    expect(requeue).toHaveBeenCalledWith(USER.db, TEST_DOCUMENT_ID)
    expect(wake).toHaveBeenCalledOnce()
  })

  it('answers queued 0 without waking for a visible document that is being indexed', async () => {
    const { service, repository, wake } = await setup()
    vi.spyOn(repository, 'requeueDocuments').mockResolvedValueOnce(0)

    await expect(service.reindexDocument(USER, TEST_DOCUMENT_ID)).resolves.toEqual({ queued: 0 })
    expect(wake).not.toHaveBeenCalled()
  })

  it('answers 404 for a document the caller cannot see', async () => {
    const { service, wake } = await setup()

    const error = await service
      .reindexDocument(USER, OTHER_DOCUMENT_ID)
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiHttpException)
    expect(error).toMatchObject({ body: { code: 'not_found', messages: ['Document not found'] } })
    expect(wake).not.toHaveBeenCalled()
  })
})
