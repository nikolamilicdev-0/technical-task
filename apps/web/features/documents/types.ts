import type { createDocumentSchema, ListDocumentsQuery } from '@kb/contracts'
import type { BadgeProps } from '@kb/ui'
import type { z } from 'zod'

import type { Dictionary } from '@/core/i18n/dictionary'
import type { IconName } from '@/core/icons'

/** State of the create and edit forms; the resolver turns it into a `CreateDocumentInput`. */
export type DocumentFormValues = z.input<typeof createDocumentSchema>

export type DocumentFormField = keyof DocumentFormValues

/** Query of the single list request the documents page makes. */
export type DocumentsListParams = Pick<ListDocumentsQuery, 'limit'>

/** Narrows the loaded documents in the browser. */
export interface DocumentsFilter {
  search: string
  tags: readonly string[]
}

/** What the documents page shows, derived from the list query and the filter. */
export type DocumentsListView = 'loading' | 'error' | 'empty' | 'results' | 'noMatches'

export interface ListViewInput {
  hasData: boolean
  isError: boolean
  /** Documents the list request returned. */
  loaded: number
  /** Documents left after filtering. */
  shown: number
}

export type DocumentsEmptyVariant = 'none' | 'noMatches'

export type ContentEditorTab = 'write' | 'preview'

/** Every key has copy under `documents.upload.errors`. */
export type UploadErrorKey = keyof Dictionary['documents']['upload']['errors']

/** Problems the browser can spot before sending a file; `unreadable` needs the server. */
export type UploadRejection = Exclude<UploadErrorKey, 'unreadable'>

export type UploadValidation = { ok: true } | { ok: false; reason: UploadRejection }

/** The file facts the client checks before uploading. */
export type UploadFileMetadata = Pick<File, 'name' | 'size' | 'type'>

export interface UploadRequestOptions {
  signal?: AbortSignal
  /** Upload progress as a 0–1 fraction. */
  onProgress?: (fraction: number) => void
}

export interface StatusBadgeStyle {
  tone: NonNullable<BadgeProps['tone']>
  icon: IconName
  /** Animates the icon (while indexing runs). */
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
  /** Set when only part of the documents was loaded. */
  note: string | null
}

/** The editor's indexing summary; the error and the retry schedule only exist after a failure. */
export interface IndexingDescription {
  summary: string
  error: string | null
  retry: string | null
}
