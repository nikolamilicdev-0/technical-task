import { FakeEmbeddingModel } from '@kb/ai'
import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'

import { EMBEDDING_MODEL } from '../../../../src/ai/ai.constants.js'
import { APP_CONFIG } from '../../../../src/config/config.constants.js'
import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import type { UserContext } from '../../../../src/database/user-context.types.js'
import { RetrievalRepository } from '../../../../src/modules/retrieval/retrieval.repository.js'
import { RetrievalService } from '../../../../src/modules/retrieval/retrieval.service.js'
import { ScriptedRetrievalRepository } from '../../../fakes/scripted-retrieval.repository.js'
import { buildTestConfig, TEST_USER } from '../../../fixtures.js'
import { buildCandidate } from '../../../fixtures/chat.js'
import { TEST_DOCUMENT_ID } from '../../../fixtures/documents.js'

const USER: UserContext = { userId: TEST_USER.id, db: {} as DatabaseClient }
const embeddingModel = new FakeEmbeddingModel({ model: 'embedder', dimensions: 4 })
const REQUEST = { query: 'pro plan price', embedding: [0.5, 0.5, 0.5, 0.5] }

async function setup(env: Record<string, string> = {}) {
  const repository = new ScriptedRetrievalRepository()
  const config = buildTestConfig({ RAG_VECTOR_K: '8', RAG_KEYWORD_K: '5', RAG_TOP_N: '2', ...env })
  const moduleRef = await Test.createTestingModule({
    providers: [
      RetrievalService,
      { provide: APP_CONFIG, useValue: config },
      { provide: EMBEDDING_MODEL, useValue: embeddingModel },
      { provide: RetrievalRepository, useValue: repository },
    ],
  }).compile()
  return { service: moduleRef.get(RetrievalService), repository }
}

describe('RetrievalService', () => {
  it('runs vector and keyword search with the configured sizes and fuses them', async () => {
    const { service, repository } = await setup({ RAG_MIN_SIMILARITY: '0.2', RAG_RRF_K: '10' })
    repository.vectorHits = [buildCandidate('a', { similarity: 0.9 }), buildCandidate('b')]
    repository.keywordHits = [buildCandidate('b', { keywordRank: 0.3 }), buildCandidate('c')]

    const chunks = await service.retrieve(USER, { ...REQUEST, documentIds: [TEST_DOCUMENT_ID] })

    const scope = {
      signature: 'embedder#4',
      userId: TEST_USER.id,
      documentIds: [TEST_DOCUMENT_ID],
    }
    expect(repository.vectorSearches).toEqual([
      { ...scope, embedding: REQUEST.embedding, matchCount: 8, minSimilarity: 0.2 },
    ])
    expect(repository.keywordSearches).toEqual([{ ...scope, text: REQUEST.query, matchCount: 5 }])
    expect(chunks.map(({ chunkId, fusedScore }) => [chunkId, fusedScore])).toEqual([
      ['chunk-b', 1 / 12 + 1 / 11],
      ['chunk-a', 1 / 11],
    ])
    expect(service.mode).toBe('hybrid')
  })

  it('skips full-text search in vector mode and keeps the vector order', async () => {
    const { service, repository } = await setup({ RAG_RETRIEVAL_MODE: 'vector' })
    repository.vectorHits = [buildCandidate('a', { similarity: 0.9 }), buildCandidate('b')]

    const chunks = await service.retrieve(USER, REQUEST)

    expect(repository.keywordSearches).toEqual([])
    expect(repository.vectorSearches[0]).toMatchObject({ documentIds: undefined })
    expect(chunks.map(({ chunkId }) => chunkId)).toEqual(['chunk-a', 'chunk-b'])
    expect(service.mode).toBe('vector')
  })
})
