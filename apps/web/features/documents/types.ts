import type { createDocumentSchema, ListDocumentsQuery } from '@kb/contracts'
import type { BadgeProps } from '@kb/ui'
import type { z } from 'zod'

import type { Dictionary } from '@/core/i18n/dictionary'
import type { IconName } from '@/core/icons'

export type DocumentFormValues = z.input<typeof createDocumentSchema>

export type DocumentFormField = keyof DocumentFormValues

export type DocumentsListParams = Pick<ListDocumentsQuery, 'limit'>

export interface DocumentsFilter {
  search: string
  tags: readonly string[]
}

export type DocumentsListView = 'loading' | 'error' | 'empty' | 'results' | 'noMatches'

export interface ListViewInput {
  hasData: boolean
  isError: boolean
  loaded: number
  shown: number
}

export type ContentEditorTab = 'write' | 'preview'

export type UploadErrorKey = keyof Dictionary['documents']['upload']['errors']

/** Problems the browser can spot before sending a file; `unreadable` needs the server. */
export type UploadRejection = Exclude<UploadErrorKey, 'unreadable'>

export type UploadValidation = { ok: true } | { ok: false; reason: UploadRejection }

export type UploadFileMetadata = Pick<File, 'name' | 'size' | 'type'>

export interface UploadRequestOptions {
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}

export interface StatusBadgeStyle {
  tone: NonNullable<BadgeProps['tone']>
  icon: IconName
  spin?: boolean
}

export interface ListCountInput {
  /** Documents left after filtering. */
  shown: number
  /** Documents the list request returned. */
  loaded: number
  /** Documents the user has in all. */
  total: number
  filtering: boolean
}

export interface ListCountDescription {
  count: string
  note: string | null
}

export interface IndexingDescription {
  summary: string
  error: string | null
  retry: string | null
}
