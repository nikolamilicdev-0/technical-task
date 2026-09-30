import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  ACCEPTED_UPLOAD_MIME_TYPES,
  type EmbeddingStatus,
  PAGE_SIZE_MAX,
} from '@kb/contracts'

import type {
  DocumentFormField,
  DocumentFormValues,
  DocumentsListParams,
  StatusBadgeStyle,
} from '@/features/documents/types'

/** One request loads the most recently updated documents; search and tags filter them locally. */
export const DOCUMENTS_LIST_PARAMS: DocumentsListParams = { limit: PAGE_SIZE_MAX }

export const EMPTY_DOCUMENT_FORM_VALUES: DocumentFormValues = { title: '', content: '', tags: [] }

export const DOCUMENT_FORM_FIELDS = [
  'title',
  'tags',
  'content',
] as const satisfies readonly DocumentFormField[]

export const UPLOAD_FILE_FIELD = 'file'

export const UPLOAD_ACCEPT = [...ACCEPTED_UPLOAD_EXTENSIONS, ...ACCEPTED_UPLOAD_MIME_TYPES].join(
  ','
)

export const TAG_COMMIT_KEYS: ReadonlySet<string> = new Set(['Enter', ','])

export const CARD_VISIBLE_TAGS = 3

export const LIST_SKELETON_CARDS = 6

export const DOCUMENT_GRID_COLUMNS = { base: 1, sm: 2, xl: 3 } as const

export const STATUS_BADGES: Readonly<Record<EmbeddingStatus, StatusBadgeStyle>> = {
  pending: { tone: 'neutral', icon: 'statusPending' },
  processing: { tone: 'primary', icon: 'statusProcessing', spin: true },
  ready: { tone: 'success', icon: 'statusReady' },
  failed: { tone: 'error', icon: 'statusFailed' },
}
