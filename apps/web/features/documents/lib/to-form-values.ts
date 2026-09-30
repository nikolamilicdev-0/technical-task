import type { Document } from '@kb/contracts'

import { haveSameTags } from '@/features/documents/lib/tags'
import type { DocumentFormValues } from '@/features/documents/types'

export function toFormValues({
  title,
  content,
  tags,
}: Pick<Document, 'title' | 'content' | 'tags'>): DocumentFormValues {
  return { title, content, tags: [...tags] }
}

export function haveSameFormValues(left: DocumentFormValues, right: DocumentFormValues): boolean {
  return (
    left.title === right.title &&
    left.content === right.content &&
    haveSameTags(left.tags ?? [], right.tags ?? [])
  )
}
