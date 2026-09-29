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

/** API field errors on these paths are shown on the matching form field. */
export const DOCUMENT_FORM_FIELDS = [
  'title',
  'tags',
  'content',
] as const satisfies readonly DocumentFormField[]

/** The multipart part that carries the file of `POST /documents/upload`. */
export const UPLOAD_FILE_FIELD = 'file'

/** `accept` of the file picker: every extension and MIME type the API can read. */
export const UPLOAD_ACCEPT = [...ACCEPTED_UPLOAD_EXTENSIONS, ...ACCEPTED_UPLOAD_MIME_TYPES].join(
  ','
)

/** Keys that turn the typed draft into a tag. */
export const TAG_COMMIT_KEYS: ReadonlySet<string> = new Set(['Enter', ','])

/** Tags a card shows before the rest collapse into `+n`. */
export const CARD_VISIBLE_TAGS = 3

export const LIST_SKELETON_CARDS = 6

/** Card columns of the documents grid (and of its loading skeleton). */
export const DOCUMENT_GRID_COLUMNS = { base: 1, sm: 2, xl: 3 } as const

/** How often relative times such as "5 minutes ago" are recomputed. */
export const RELATIVE_TIME_REFRESH_MS = 60_000

/** Changes younger than this read as "just now". */
export const JUST_NOW_MS = 60_000

export const STATUS_BADGES: Readonly<Record<EmbeddingStatus, StatusBadgeStyle>> = {
  pending: { tone: 'neutral', icon: 'statusPending' },
  processing: { tone: 'primary', icon: 'statusProcessing', spin: true },
  ready: { tone: 'success', icon: 'statusReady' },
  failed: { tone: 'error', icon: 'statusFailed' },
}
