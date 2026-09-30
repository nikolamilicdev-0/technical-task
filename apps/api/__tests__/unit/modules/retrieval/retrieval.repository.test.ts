import { describe, expect, it } from 'vitest'

import { toStoredVector } from '../../../../src/common/utils/vector.js'
import { DatabaseRequestError } from '../../../../src/database/database-error.js'
import { RetrievalRepository } from '../../../../src/modules/retrieval/retrieval.repository.js'
import type {
  KeywordHitRow,
  VectorHitRow,
} from '../../../../src/modules/retrieval/retrieval.types.js'
import { fakeDatabase } from '../../../fakes/fake-database.js'
import { TEST_USER } from '../../../fixtures.js'
import { TEST_CHUNK_ID } from '../../../fixtures/chat.js'
import { TEST_DOCUMENT_ID } from '../../../fixtures/documents.js'

const repository = new RetrievalRepository()
const SIGNATURE = 'gemini-embedding-001#1536'
const SCOPE = { signature: SIGNATURE, userId: TEST_USER.id }
const EMBEDDING = [0.6, 0.8]
const CHUNK = {
  chunk_id: TEST_CHUNK_ID,
  document_id: TEST_DOCUMENT_ID,
  document_title: 'Pricing',
  chunk_index: 2,
  content: 'The Pro plan costs 20 euros.',
  heading_path: 'Pricing › Plans',
}
const VECTOR_ROW: VectorHitRow = { ...CHUNK, similarity: 0.82 }
const KEYWORD_ROW: KeywordHitRow = { ...CHUNK, keyword_rank: 0.4 }
const MAPPED_CHUNK = {
  chunkId: TEST_CHUNK_ID,
  documentId: TEST_DOCUMENT_ID,
  documentTitle: 'Pricing',
  chunkIndex: 2,
  content: 'The Pro plan costs 20 euros.',
  headingPath: 'Pricing › Plans',
}

describe('RetrievalRepository', () => {
  it('calls match_chunks with the padded vector literal and every filter', async () => {
    const { db, queries } = fakeDatabase({ data: [VECTOR_ROW] })

    const hits = await repository.matchChunks(db, {
      ...SCOPE,
      embedding: EMBEDDING,
      matchCount: 20,
      minSimilarity: 0.1,
      documentIds: [TEST_DOCUMENT_ID],
    })

    expect(queries).toEqual([
      [
        {
          method: 'rpc',
          args: [
            'match_chunks',
            {
              p_query_embedding: toStoredVector(EMBEDDING),
              p_embedding_model: SIGNATURE,
              p_match_count: 20,
              p_min_similarity: 0.1,
              p_user_id: TEST_USER.id,
              p_document_ids: [TEST_DOCUMENT_ID],
            },
          ],
        },
      ],
    ])
    expect(hits).toEqual([{ ...MAPPED_CHUNK, similarity: 0.82 }])
  })

  it('calls search_chunks_keyword with the query text, leaving the scope unset by default', async () => {
    const { db, queries } = fakeDatabase({ data: [KEYWORD_ROW] })

    const hits = await repository.searchKeyword(db, { ...SCOPE, text: 'pro plan', matchCount: 5 })

    expect(queries[0]).toEqual([
      {
        method: 'rpc',
        args: [
          'search_chunks_keyword',
          {
            p_query_text: 'pro plan',
            p_embedding_model: SIGNATURE,
            p_match_count: 5,
            p_user_id: TEST_USER.id,
          },
        ],
      },
    ])
    expect(hits).toEqual([{ ...MAPPED_CHUNK, keywordRank: 0.4 }])
  })

  it('throws failures with their HTTP status', async () => {
    const failure = { code: '42883', message: 'function does not exist', details: '', hint: '' }
    const { db } = fakeDatabase({ error: failure, status: 404 })

    const rejection = repository.searchKeyword(db, { ...SCOPE, text: 'x', matchCount: 1 })

    await expect(rejection).rejects.toBeInstanceOf(DatabaseRequestError)
    await expect(rejection).rejects.toMatchObject({ status: 404, code: '42883' })
  })
})
