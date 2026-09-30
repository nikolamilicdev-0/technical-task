import type { CreateDocumentInput, Document, UpdateDocumentInput } from '@kb/contracts'

import { haveSameTags } from '@/features/documents/lib/tags'

export function toUpdateInput(
  values: CreateDocumentInput,
  saved: Pick<Document, 'title' | 'content' | 'tags'>
): UpdateDocumentInput {
  const input: UpdateDocumentInput = {}
  if (values.title !== saved.title) input.title = values.title
  if (values.content !== saved.content) input.content = values.content
  if (!haveSameTags(values.tags, saved.tags)) input.tags = values.tags
  return input
}

export function hasChanges(input: UpdateDocumentInput): boolean {
  return Object.values(input).some((value) => value !== undefined)
}
