import { type ReindexResult, reindexResultSchema } from '@kb/contracts'
import { Injectable } from '@nestjs/common'

import { ApiHttpException } from '../../common/errors/api-http.exception.js'
import type { UserContext } from '../../database/user-context.types.js'
import { DOCUMENT_NOT_FOUND_MESSAGE } from '../documents/documents.constants.js'
import { IngestionRepository } from './ingestion.repository.js'
import { IngestionWorker } from './ingestion.worker.js'

/** Re-queues the caller's documents through their RLS client, then wakes the worker. */
@Injectable()
export class ReindexService {
  constructor(
    private readonly repository: IngestionRepository,
    private readonly worker: IngestionWorker
  ) {}

  /** `{ queued: 0 }` while the document is being indexed; 404 when the caller cannot see it. */
  async reindexDocument(user: UserContext, documentId: string): Promise<ReindexResult> {
    const queued = await this.repository.requeueDocuments(user.db, documentId)
    if (queued === 0 && !(await this.repository.documentExists(user.db, documentId))) {
      throw new ApiHttpException('not_found', [DOCUMENT_NOT_FOUND_MESSAGE])
    }
    return this.#queued(queued)
  }

  /** Every document of the caller except those being indexed right now. */
  async reindexAll(user: UserContext): Promise<ReindexResult> {
    return this.#queued(await this.repository.requeueDocuments(user.db))
  }

  #queued(queued: number): ReindexResult {
    if (queued > 0) void this.worker.wake()
    return reindexResultSchema.parse({ queued })
  }
}
