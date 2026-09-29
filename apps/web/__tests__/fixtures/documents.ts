import type { Document, DocumentList, DocumentSummary } from '@kb/contracts'

export const DOCUMENT_ID = '3f2b8c1e-4d5a-4e6f-9a7b-1c2d3e4f5a6b'
export const UPDATED_AT = '2026-09-29T10:00:00.000Z'

const CONTENT = '# Onboarding\n\nWelcome to the team.'

export function buildDocumentSummary(overrides: Partial<DocumentSummary> = {}): DocumentSummary {
  return {
    id: DOCUMENT_ID,
    title: 'Onboarding guide',
    contentPreview: CONTENT,
    contentLength: CONTENT.length,
    tags: ['handbook'],
    sourceType: 'editor',
    sourceFilename: null,
    embeddingStatus: 'ready',
    embeddingError: null,
    embeddingModel: 'text-embedding-3-small',
    chunkCount: 3,
    ingestionAttempts: 1,
    nextAttemptAt: null,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  }
}

export function buildDocument(overrides: Partial<Document> = {}): Document {
  return { ...buildDocumentSummary(overrides), content: CONTENT, ...overrides }
}

export function buildDocumentList(items: DocumentSummary[], total = items.length): DocumentList {
  return { items, total, limit: 200, offset: 0 }
}
