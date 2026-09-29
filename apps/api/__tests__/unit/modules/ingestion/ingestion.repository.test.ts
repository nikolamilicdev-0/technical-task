import { describe, expect, it } from 'vitest'

import { DatabaseRequestError } from '../../../../src/database/database-error.js'
import { IngestionRepository } from '../../../../src/modules/ingestion/ingestion.repository.js'
import type { ChunkUpsert } from '../../../../src/modules/ingestion/ingestion.types.js'
import { fakeDatabase } from '../../../fakes/fake-database.js'
import { TEST_USER } from '../../../fixtures.js'
import { TEST_DOCUMENT_ID } from '../../../fixtures/documents.js'

const repository = new IngestionRepository()
const HASH = 'a'.repeat(64)
const SIGNATURE = 'gemini-embedding-001#1536'
const CHUNK: ChunkUpsert = {
  index: 0,
  content: 'Install it.',
  headingPath: 'Guide › Setup',
  tokenCount: 3,
  contentHash: 'b'.repeat(64),
  embedding: '[0.1,0.2]',
}
const FAILURE = { message: 'upstream timeout', details: '', hint: '', code: '' }

describe('IngestionRepository', () => {
  it('claims with the batch size, stale window and attempt limit, mapping rows', async () => {
    const row = {
      id: TEST_DOCUMENT_ID,
      user_id: TEST_USER.id,
      title: 'Guide',
      content: '# Setup',
      content_hash: HASH,
      ingestion_attempts: 2,
    }
    const { db, queries } = fakeDatabase({ data: [row] })

    const claimed = await repository.claimPending(db, {
      batchSize: 5,
      staleAfterMinutes: 10,
      maxAttempts: 4,
    })

    expect(queries).toEqual([
      [
        {
          method: 'rpc',
          args: [
            'claim_pending_documents',
            { p_batch_size: 5, p_stale_after_minutes: 10, p_max_attempts: 4 },
          ],
        },
      ],
    ])
    expect(claimed).toEqual([
      {
        id: TEST_DOCUMENT_ID,
        userId: TEST_USER.id,
        title: 'Guide',
        content: '# Setup',
        contentHash: HASH,
        attempt: 2,
      },
    ])
  })

  it('reads the stored chunk hashes of one document under one signature', async () => {
    const { db, queries } = fakeDatabase({ data: [{ content_hash: 'x' }, { content_hash: 'y' }] })

    const hashes = await repository.existingChunkHashes(db, TEST_DOCUMENT_ID, SIGNATURE)

    expect(hashes).toEqual(new Set(['x', 'y']))
    expect(queries[0]).toEqual([
      { method: 'from', args: ['document_chunks'] },
      { method: 'select', args: ['content_hash'] },
      { method: 'eq', args: ['document_id', TEST_DOCUMENT_ID] },
      { method: 'eq', args: ['embedding_model', SIGNATURE] },
    ])
  })

  it('sends chunks in the snake_case shape upsert_document_chunks reads', async () => {
    const { db, queries } = fakeDatabase({ data: 2 })

    const stored = await repository.upsertChunks(db, TEST_DOCUMENT_ID, HASH, SIGNATURE, [
      CHUNK,
      { ...CHUNK, index: 1, contentHash: 'c'.repeat(64), embedding: null },
    ])

    expect(stored).toBe(true)
    expect(queries[0]).toEqual([
      {
        method: 'rpc',
        args: [
          'upsert_document_chunks',
          {
            p_document_id: TEST_DOCUMENT_ID,
            p_content_hash: HASH,
            p_embedding_model: SIGNATURE,
            p_chunks: [
              {
                chunk_index: 0,
                content: 'Install it.',
                heading_path: 'Guide › Setup',
                token_count: 3,
                content_hash: 'b'.repeat(64),
                embedding: '[0.1,0.2]',
              },
              {
                chunk_index: 1,
                content: 'Install it.',
                heading_path: 'Guide › Setup',
                token_count: 3,
                content_hash: 'c'.repeat(64),
                embedding: null,
              },
            ],
          },
        ],
      },
    ])
  })

  it('reports a stale upsert and a stale finalize', async () => {
    const { db } = fakeDatabase({ data: -1 }, { data: -1 })

    await expect(
      repository.upsertChunks(db, TEST_DOCUMENT_ID, HASH, SIGNATURE, [CHUNK])
    ).resolves.toBe(false)
    await expect(repository.finalize(db, TEST_DOCUMENT_ID, HASH, SIGNATURE)).resolves.toBeNull()
  })

  it('finalizes with the content hash and signature, returning the chunk count', async () => {
    const { db, queries } = fakeDatabase({ data: 14 })

    await expect(repository.finalize(db, TEST_DOCUMENT_ID, HASH, SIGNATURE)).resolves.toBe(14)
    expect(queries[0]).toEqual([
      {
        method: 'rpc',
        args: [
          'finalize_document_ingestion',
          { p_document_id: TEST_DOCUMENT_ID, p_content_hash: HASH, p_embedding_model: SIGNATURE },
        ],
      },
    ])
  })

  it('marks a failure with a retry delay, or without one for good', async () => {
    const { db, queries } = fakeDatabase({}, {})

    await repository.markFailed(db, TEST_DOCUMENT_ID, 'Rate limited', 60)
    await repository.markFailed(db, TEST_DOCUMENT_ID, 'Bad key', null)

    expect(queries.map((calls) => calls[0]?.args)).toEqual([
      [
        'mark_document_ingestion_failed',
        { p_document_id: TEST_DOCUMENT_ID, p_error: 'Rate limited', p_retry_in_seconds: 60 },
      ],
      ['mark_document_ingestion_failed', { p_document_id: TEST_DOCUMENT_ID, p_error: 'Bad key' }],
    ])
  })

  it('re-queues for a model signature, and one or all documents of the caller', async () => {
    const { db, queries } = fakeDatabase({ data: 3 }, { data: 1 }, { data: 7 })

    await expect(repository.requeueForModel(db, SIGNATURE)).resolves.toBe(3)
    await expect(repository.requeueDocuments(db, TEST_DOCUMENT_ID)).resolves.toBe(1)
    await expect(repository.requeueDocuments(db)).resolves.toBe(7)
    expect(queries.map((calls) => calls[0]?.args)).toEqual([
      ['requeue_documents_for_model', { p_embedding_model: SIGNATURE }],
      ['requeue_documents', { p_document_id: TEST_DOCUMENT_ID }],
      ['requeue_documents', {}],
    ])
  })

  it('checks that the caller can see a document', async () => {
    const { db, queries } = fakeDatabase({ data: { id: TEST_DOCUMENT_ID } }, { data: null })

    await expect(repository.documentExists(db, TEST_DOCUMENT_ID)).resolves.toBe(true)
    await expect(repository.documentExists(db, TEST_DOCUMENT_ID)).resolves.toBe(false)
    expect(queries[0]).toEqual([
      { method: 'from', args: ['documents'] },
      { method: 'select', args: ['id'] },
      { method: 'eq', args: ['id', TEST_DOCUMENT_ID] },
      { method: 'maybeSingle', args: [] },
    ])
  })

  it('throws failures with their HTTP status, so transient ones can be retried', async () => {
    const { db } = fakeDatabase({ error: FAILURE, status: 504 })

    const error = await repository
      .claimPending(db, { batchSize: 1, staleAfterMinutes: 1, maxAttempts: 1 })
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(DatabaseRequestError)
    expect(error).toMatchObject({ status: 504, transient: true, message: FAILURE.message })
  })
})
