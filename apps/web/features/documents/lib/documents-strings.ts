import {
  DOCUMENT_CONTENT_MAX,
  type DocumentSummary,
  type ErrorCode,
  MAX_UPLOAD_BYTES,
} from '@kb/contracts'

import { isApiError } from '@/core/api/api-error'
import { getErrorMessage } from '@/core/api/get-error-message'
import type { Dictionary } from '@/core/i18n/dictionary'
import { interpolate, pluralize } from '@/core/i18n/interpolate'
import { formatRecentTime, formatRelativeTime } from '@/core/utils/format-date'
import { formatBytes, formatNumber } from '@/core/utils/format-number'
import type {
  IndexingDescription,
  ListCountDescription,
  ListCountInput,
  UploadErrorKey,
} from '@/features/documents/types'

export type DocumentsStrings = Dictionary['documents']

type IndexingFields = Pick<
  DocumentSummary,
  'embeddingStatus' | 'embeddingError' | 'chunkCount' | 'nextAttemptAt'
>

const UPLOAD_ERROR_KEYS: Readonly<Partial<Record<ErrorCode, UploadErrorKey>>> = {
  payload_too_large: 'tooLarge',
  unsupported_media_type: 'unsupportedType',
  invalid_payload: 'unreadable',
}

export function getDocumentsStrings(dictionary: Dictionary): DocumentsStrings {
  return dictionary.documents
}

export function formatUploadError(strings: DocumentsStrings, key: UploadErrorKey): string {
  return interpolate(strings.upload.errors[key], {
    maximum: formatBytes(MAX_UPLOAD_BYTES),
    characters: formatNumber(DOCUMENT_CONTENT_MAX),
  })
}

export function getUploadErrorMessage(dictionary: Dictionary, error: unknown): string {
  const key = isApiError(error) ? UPLOAD_ERROR_KEYS[error.code] : undefined
  if (key) return formatUploadError(dictionary.documents, key)
  return getErrorMessage(error, dictionary.errors)
}

/** The note says only the newest page is loaded (and searched) when there are more. */
export function describeListCount(
  strings: DocumentsStrings,
  { shown, loaded, total, filtering }: ListCountInput
): ListCountDescription {
  const count = filtering
    ? pluralize(strings.list.filteredCount, total, { shown: formatNumber(shown) })
    : pluralize(strings.list.count, total)
  const note =
    loaded < total ? interpolate(strings.list.truncated, { shown: formatNumber(loaded) }) : null
  return { count, note }
}

export function formatDocumentMeta(
  strings: DocumentsStrings,
  { updatedAt, sourceFilename }: Pick<DocumentSummary, 'updatedAt' | 'sourceFilename'>,
  now: number
): string {
  const time = formatRecentTime(updatedAt, now, strings.card.justNow)
  if (!sourceFilename) return interpolate(strings.card.updated, { time })
  return interpolate(strings.card.updatedUpload, { time, filename: sourceFilename })
}

export function describeIndexing(
  strings: DocumentsStrings,
  document: IndexingFields,
  now: number
): IndexingDescription {
  const copy = strings.statusBar
  switch (document.embeddingStatus) {
    case 'pending':
      return { summary: copy.pending, error: null, retry: null }
    case 'processing':
      return { summary: copy.processing, error: null, retry: null }
    case 'ready':
      return { summary: pluralize(copy.ready, document.chunkCount), error: null, retry: null }
    case 'failed':
      return {
        summary: copy.failed,
        error: document.embeddingError,
        retry: describeRetry(strings, document.nextAttemptAt, now),
      }
  }
}

// A retry that is already due is about to be picked up, so it reads as "now" rather than past.
function describeRetry(
  strings: DocumentsStrings,
  nextAttemptAt: string | null,
  now: number
): string | null {
  if (!nextAttemptAt) return null
  const retryAt = Math.max(Date.parse(nextAttemptAt), now)
  const time = formatRelativeTime(new Date(retryAt), new Date(now))
  return interpolate(strings.statusBar.retryScheduled, { time })
}
