import type { CreateDocumentInput, Document, UpdateDocumentInput } from '@kb/contracts'

/** The PATCH body for a submitted edit form: only the fields that differ from the saved document. */
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

function haveSameTags(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((tag, index) => tag === right[index])
}
