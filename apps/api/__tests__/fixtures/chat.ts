import type { Citation, Conversation, Message } from '@kb/contracts'

import type { ConversationRow, MessageRow } from '../../src/modules/chat/chat.types.js'
import type { CandidateChunk, RetrievedChunk } from '../../src/modules/retrieval/retrieval.types.js'
import { API_TIMESTAMP, POSTGREST_TIMESTAMP, TEST_DOCUMENT_ID } from './documents.js'

export const TEST_CONVERSATION_ID = '7c1e4b2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c'
export const TEST_MESSAGE_ID = '2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d'
export const TEST_CHUNK_ID = '5d6e7f8a-9b0c-4d1e-8f2a-3b4c5d6e7f8a'

export function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: TEST_CONVERSATION_ID,
    title: null,
    createdAt: API_TIMESTAMP,
    updatedAt: API_TIMESTAMP,
    ...overrides,
  }
}

/** A `conversations` row as PostgREST returns it for the API's select list. */
export function buildConversationRow(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: TEST_CONVERSATION_ID,
    title: 'Pricing questions',
    created_at: POSTGREST_TIMESTAMP,
    updated_at: POSTGREST_TIMESTAMP,
    ...overrides,
  }
}

export function buildCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    index: 1,
    documentId: TEST_DOCUMENT_ID,
    documentTitle: 'Pricing',
    chunkId: TEST_CHUNK_ID,
    chunkIndex: 0,
    headingPath: 'Pricing › Plans',
    excerpt: 'The Pro plan costs 20 euros a month.',
    score: 0.032,
    cited: false,
    ...overrides,
  }
}

export function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: TEST_MESSAGE_ID,
    conversationId: TEST_CONVERSATION_ID,
    role: 'user',
    content: 'What does the Pro plan cost?',
    citations: [],
    createdAt: API_TIMESTAMP,
    ...overrides,
  }
}

/** A `messages` row of a question, as PostgREST returns it for the API's select list. */
export function buildMessageRow(overrides: Partial<MessageRow> = {}): MessageRow {
  return {
    id: TEST_MESSAGE_ID,
    conversation_id: TEST_CONVERSATION_ID,
    role: 'user',
    content: 'What does the Pro plan cost?',
    citations: [],
    model: null,
    finish_reason: null,
    prompt_tokens: null,
    completion_tokens: null,
    usage_estimated: false,
    created_at: POSTGREST_TIMESTAMP,
    ...overrides,
  }
}

/** A search hit; ids are derived from `key`, so equal keys are the same chunk. */
export function buildCandidate(
  key: string,
  overrides: Partial<CandidateChunk> = {}
): CandidateChunk {
  return {
    chunkId: `chunk-${key}`,
    documentId: TEST_DOCUMENT_ID,
    documentTitle: 'Pricing',
    chunkIndex: 0,
    content: `Content of ${key}.`,
    headingPath: `Pricing › ${key}`,
    ...overrides,
  }
}

export function buildRetrievedChunk(
  key: string,
  overrides: Partial<RetrievedChunk> = {}
): RetrievedChunk {
  return { ...buildCandidate(key), fusedScore: 1 / 61, ranks: [1, null], ...overrides }
}
