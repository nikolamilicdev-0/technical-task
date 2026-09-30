import type { Citation, Conversation, DocumentSummary, Message } from '@kb/contracts'
import type { ZodType } from 'zod'

export const IDS = {
  document: '3f2b8c1e-4d5a-4e6f-9a7b-1c2d3e4f5a6b',
  chunk: '8d0c7a52-1b3e-4f60-8a9d-2e4f6a8c0b1d',
  conversation: 'c5e1a9f0-7d2b-4c3e-a1f4-9b8d7c6e5f4a',
  userMessage: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  assistantMessage: 'f9e8d7c6-b5a4-4938-a7b6-c5d4e3f2a1b0',
} as const

export const ISO_TIMESTAMP = '2026-09-29T10:00:00.000Z'
export const POSTGRES_TIMESTAMP = '2026-09-29T10:00:00.123456+00:00'

export function issuePaths(schema: ZodType, input: unknown): string[] {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

export function buildDocumentSummary(overrides: Partial<DocumentSummary> = {}): DocumentSummary {
  return {
    id: IDS.document,
    title: 'Onboarding guide',
    contentPreview: '# Onboarding\n\nWelcome to the team.',
    contentLength: 1_024,
    tags: ['handbook'],
    sourceType: 'editor',
    sourceFilename: null,
    embeddingStatus: 'ready',
    embeddingError: null,
    embeddingModel: 'text-embedding-3-small',
    chunkCount: 3,
    ingestionAttempts: 1,
    nextAttemptAt: POSTGRES_TIMESTAMP,
    createdAt: ISO_TIMESTAMP,
    updatedAt: POSTGRES_TIMESTAMP,
    ...overrides,
  }
}

export function buildCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    index: 1,
    documentId: IDS.document,
    documentTitle: 'Onboarding guide',
    chunkId: IDS.chunk,
    chunkIndex: 0,
    headingPath: 'Onboarding guide › First week',
    excerpt: 'Pair with your buddy on day one.',
    score: 0.0325,
    cited: true,
    ...overrides,
  }
}

export function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: IDS.userMessage,
    conversationId: IDS.conversation,
    role: 'user',
    content: 'What happens in the first week?',
    citations: [],
    createdAt: ISO_TIMESTAMP,
    ...overrides,
  }
}

export function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: IDS.conversation,
    title: 'What happens in the first week?',
    createdAt: ISO_TIMESTAMP,
    updatedAt: POSTGRES_TIMESTAMP,
    ...overrides,
  }
}
