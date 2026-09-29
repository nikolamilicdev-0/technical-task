import type { Document } from '@kb/contracts'

import type { DocumentFormValues } from '@/features/documents/types'

/** The edit form's starting values for a saved document. */
export function toFormValues({
  title,
  content,
  tags,
}: Pick<Document, 'title' | 'content' | 'tags'>): DocumentFormValues {
  return { title, content, tags: [...tags] }
}
