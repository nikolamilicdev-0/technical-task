import {
  type Citation,
  type FinishReason,
  MESSAGE_MAX_LENGTH,
  type MessageUsage,
} from '@kb/contracts'

import type { Dictionary } from '@/core/i18n/dictionary'
import { interpolate, pluralize } from '@/core/i18n/interpolate'
import { formatNumber } from '@/core/utils/format-number'
import { FINISH_NOTE_REASONS } from '@/features/chat/constants'
import type {
  FinishNoteReason,
  IndexingNoticeCopy,
  IndexingSummary,
  StreamError,
  ThreadView,
} from '@/features/chat/types'

export type ChatStrings = Dictionary['chat']

export function getChatStrings(dictionary: Dictionary): ChatStrings {
  return dictionary.chat
}

export function describeStreamError(dictionary: Dictionary, error: StreamError): string {
  const copy = dictionary.chat.errors
  const { code, retryAfter } = error
  if (code === 'network') return dictionary.errors.network
  if (code === 'interrupted') return copy.interrupted
  if (code === 'not_found') return copy.conversationGone
  if (retryAfter && code === 'rate_limited') {
    return interpolate(copy.rateLimited, { seconds: retryAfter })
  }
  if (retryAfter && code === 'ai_provider_unavailable') {
    return interpolate(copy.providerUnavailable, { seconds: retryAfter })
  }
  return dictionary.errors.codes[code]
}

export function describeSources(strings: ChatStrings, citations: readonly Citation[]): string {
  const sources = pluralize(strings.sources.count, citations.length)
  const citedCount = citations.filter((citation) => citation.cited).length
  if (citedCount === 0) return sources
  const cited = interpolate(strings.sources.cited, { count: formatNumber(citedCount) })
  return interpolate(strings.sources.summary, { sources, cited })
}

export function describeProgress(strings: ChatStrings, citations: readonly Citation[]): string {
  if (citations.length === 0) return strings.message.searching
  return pluralize(strings.message.reading, citations.length)
}

export function describeUsage(strings: ChatStrings, usage: MessageUsage): string {
  const template = usage.estimated ? strings.message.usageEstimated : strings.message.usage
  return interpolate(template, { tokens: formatNumber(usage.totalTokens) })
}

function isFinishNoteReason(reason: FinishReason | undefined): reason is FinishNoteReason {
  return reason !== undefined && FINISH_NOTE_REASONS.has(reason)
}

export function describeFinish(
  strings: ChatStrings,
  reason: FinishReason | undefined
): string | null {
  return isFinishNoteReason(reason) ? strings.message.finish[reason] : null
}

export function describeIndexing(
  strings: ChatStrings,
  summary: IndexingSummary
): IndexingNoticeCopy {
  const failedCount = summary.failed.length
  return {
    indexing: summary.indexing > 0 ? pluralize(strings.indexing.pending, summary.indexing) : null,
    failed: failedCount > 0 ? pluralize(strings.indexing.failed, failedCount) : null,
  }
}

/** Null while a saved conversation loads: a placeholder beats flashing "Untitled". */
export function describeThreadTitle(
  strings: ChatStrings,
  view: ThreadView,
  { saved, title }: { saved: boolean; title: string | null | undefined }
): string | null {
  if (view === 'loading') return null
  if (view === 'notFound' || view === 'error') return strings.title
  if (!saved) return strings.newChat
  return title ?? strings.untitled
}

export function describeScope(strings: ChatStrings, selectedCount: number): string {
  return selectedCount === 0 ? strings.scope.all : pluralize(strings.scope.selected, selectedCount)
}

export function describeCharacterCount(strings: ChatStrings, length: number): string {
  return interpolate(strings.composer.count, {
    count: formatNumber(length),
    maximum: formatNumber(MESSAGE_MAX_LENGTH),
  })
}
