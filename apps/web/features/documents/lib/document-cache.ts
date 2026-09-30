import type { Document, DocumentList, DocumentSummary, UpdateDocumentInput } from '@kb/contracts'

export function withPendingStatus<TDocument extends DocumentSummary>(
  document: TDocument
): TDocument {
  return { ...document, embeddingStatus: 'pending', embeddingError: null }
}

/** Mirrors the database trigger: a new title or content re-queues indexing, tags alone do not. */
export function applyDocumentUpdate(document: Document, input: UpdateDocumentInput): Document {
  const next: Document = {
    ...document,
    title: input.title ?? document.title,
    content: input.content ?? document.content,
    tags: input.tags ?? document.tags,
  }
  const textChanged = next.title !== document.title || next.content !== document.content
  return textChanged ? withPendingStatus(next) : next
}

export function removeFromList(list: DocumentList, id: string): DocumentList {
  const items = list.items.filter((item) => item.id !== id)
  if (items.length === list.items.length) return list
  return { ...list, items, total: Math.max(list.total - 1, 0) }
}

export function updateInList(
  list: DocumentList,
  id: string,
  update: (document: DocumentSummary) => DocumentSummary
): DocumentList {
  return { ...list, items: list.items.map((item) => (item.id === id ? update(item) : item)) }
}
