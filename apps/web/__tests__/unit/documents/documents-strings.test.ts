import type { ErrorCode } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { buildDocumentSummary, UPDATED_AT } from '@/__tests__/fixtures/documents'
import { ApiError, networkError } from '@/core/api/api-error'
import {
  describeIndexing,
  describeListCount,
  formatDocumentMeta,
  formatUploadError,
  getDocumentsStrings,
  getUploadErrorMessage,
} from '@/features/documents/lib/documents-strings'
import en from '@/messages/en.json'

const strings = getDocumentsStrings(en)
const MINUTE_MS = 60_000
const NOW = Date.parse(UPDATED_AT)

describe('getUploadErrorMessage', () => {
  it.each([
    ['payload_too_large', 413, 'This file is larger than 10 MB.'],
    ['unsupported_media_type', 415, 'Only .txt, .md and .pdf files can be uploaded.'],
    [
      'invalid_payload',
      422,
      'No usable text could be read from this file. It may be a scanned or protected PDF, not UTF-8 text, or longer than 500,000 characters.',
    ],
  ] as const)('explains %s (%d)', (code: ErrorCode, status, expected) => {
    expect(getUploadErrorMessage(en, new ApiError({ status, code }))).toBe(expected)
  })

  it('uses the shared error copy for anything else', () => {
    const rateLimited = new ApiError({ status: 429, code: 'rate_limited', retryAfter: 12 })
    expect(getUploadErrorMessage(en, rateLimited)).toBe('Too many requests. Try again in 12 s.')
    expect(getUploadErrorMessage(en, networkError())).toBe(en.errors.network)
  })
})

describe('formatUploadError', () => {
  it('fills in the limits', () => {
    expect(formatUploadError(strings, 'tooLarge')).toBe('This file is larger than 10 MB.')
    expect(formatUploadError(strings, 'empty')).toBe(strings.upload.errors.empty)
  })
})

describe('describeIndexing', () => {
  const describe_ = (overrides: Parameters<typeof buildDocumentSummary>[0]) =>
    describeIndexing(strings, buildDocumentSummary(overrides), NOW)

  it('describes queued and running indexing', () => {
    expect(describe_({ embeddingStatus: 'pending' }).summary).toBe(strings.statusBar.pending)
    expect(describe_({ embeddingStatus: 'processing' }).summary).toBe(strings.statusBar.processing)
  })

  it('counts the passages of an indexed document', () => {
    expect(describe_({ embeddingStatus: 'ready', chunkCount: 1 }).summary).toBe(
      'Indexed as 1 passage. Chat answers can cite it.'
    )
    expect(describe_({ embeddingStatus: 'ready', chunkCount: 12 }).summary).toBe(
      'Indexed as 12 passages. Chat answers can cite it.'
    )
  })

  it('gives the reason for a failure and when it is retried', () => {
    const nextAttemptAt = new Date(NOW + 5 * MINUTE_MS).toISOString()
    expect(
      describe_({ embeddingStatus: 'failed', embeddingError: 'Key rejected', nextAttemptAt })
    ).toEqual({
      summary: strings.statusBar.failed,
      error: 'Key rejected',
      retry: 'Retrying automatically in 5 minutes.',
    })
  })

  it('reads an overdue retry as now and leaves out retries that will not happen', () => {
    const overdue = new Date(NOW - 2 * MINUTE_MS).toISOString()
    expect(describe_({ embeddingStatus: 'failed', nextAttemptAt: overdue }).retry).toBe(
      'Retrying automatically now.'
    )
    expect(describe_({ embeddingStatus: 'failed', nextAttemptAt: null }).retry).toBeNull()
  })
})

describe('formatDocumentMeta', () => {
  const meta = (updatedAt: string, sourceFilename: string | null = null) =>
    formatDocumentMeta(strings, { updatedAt, sourceFilename }, NOW)

  it('reads recent changes, and clocks running slightly ahead, as just now', () => {
    expect(meta(new Date(NOW - 20_000).toISOString())).toBe('Updated just now')
    expect(meta(new Date(NOW + 5_000).toISOString())).toBe('Updated just now')
  })

  it('uses relative time after a minute and names uploaded files', () => {
    expect(meta(new Date(NOW - 5 * MINUTE_MS).toISOString())).toBe('Updated 5 minutes ago')
    expect(meta(new Date(NOW - 120 * MINUTE_MS).toISOString(), 'notes.pdf')).toBe(
      'Updated 2 hours ago · notes.pdf'
    )
  })
})

describe('describeListCount', () => {
  it('counts every document, or the matches while filtering', () => {
    const all = { shown: 12, loaded: 12, total: 12, filtering: false }
    expect(describeListCount(strings, all)).toEqual({ count: '12 documents', note: null })
    expect(describeListCount(strings, { ...all, total: 1, loaded: 1, shown: 1 }).count).toBe(
      '1 document'
    )
    expect(describeListCount(strings, { ...all, shown: 3, filtering: true }).count).toBe(
      '3 of 12 documents'
    )
  })

  it('notes when only the newest documents were loaded', () => {
    const truncated = { shown: 200, loaded: 200, total: 1_250, filtering: false }
    expect(describeListCount(strings, truncated)).toEqual({
      count: '1,250 documents',
      note: 'Only the 200 most recently updated are listed and searched.',
    })
  })
})
