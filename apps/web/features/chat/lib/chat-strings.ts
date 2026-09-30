import {
  type Citation,
  type FinishReason,
  MESSAGE_MAX_LENGTH,
  type MessageUsage,
} from '@kb/contracts'

import type { Dictionary } from '@/core/i18n/dictionary'
import { interpolate, pluralize } from '@/core/i18n/interpolate'
import { formatRelativeTime } from '@/core/utils/format-date'
import { formatNumber } from '@/core/utils/format-number'
import { FINISH_NOTE_REASONS, JUST_NOW_MS } from '@/features/chat/constants'
import type {
  FinishNoteReason,
  IndexingNoticeCopy,
  IndexingSummary,
  StreamError,
  ThreadView,
} from '@/features/chat/types'

export type ChatStrings = Dictionary['chat']

/** All chat copy, for server bodies and client components alike. */
export function getChatStrings(dictionary: Dictionary): ChatStrings {
  return dictionary.chat
}

/** What the error row says; rate limits and outages say when sending can succeed again. */
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

/** `6 sources · 2 cited`, or just the source count when the answer cites none. */
export function describeSources(strings: ChatStrings, citations: readonly Citation[]): string {
  const sources = pluralize(strings.sources.count, citations.length)
  const citedCount = citations.filter((citation) => citation.cited).length
  if (citedCount === 0) return sources
  const cited = interpolate(strings.sources.cited, { count: formatNumber(citedCount) })
  return interpolate(strings.sources.summary, { sources, cited })
}

/** What the answer placeholder says before the first token: searching, then reading sources. */
export function describeProgress(strings: ChatStrings, citations: readonly Citation[]): string {
  if (citations.length === 0) return strings.message.searching
  return pluralize(strings.message.reading, citations.length)
}

export function describeUsage(strings: ChatStrings, usage: MessageUsage): string {
  const template = usage.estimated ? strings.message.usageEstimated : strings.message.usage
  return interpolate(template, { tokens: formatNumber(usage.totalTokens) })
}

export function isFinishNoteReason(reason: FinishReason | undefined): reason is FinishNoteReason {
  return reason !== undefined && FINISH_NOTE_REASONS.has(reason)
}

/** Why an answer ended early, or null when it simply finished. */
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

/**
 * The thread's heading: the conversation's title, "New chat" before one exists, and null while
 * a saved conversation loads (a placeholder beats flashing "Untitled").
 */
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

/** The scope picker's summary: every document, or how many are picked. */
export function describeScope(strings: ChatStrings, selectedCount: number): string {
  return selectedCount === 0 ? strings.scope.all : pluralize(strings.scope.selected, selectedCount)
}

/** `just now`, `3 hours ago`; a clock running slightly ahead also reads as just now. */
export function formatConversationTime(
  strings: ChatStrings,
  updatedAt: string,
  now: number
): string {
  if (now - Date.parse(updatedAt) < JUST_NOW_MS) return strings.list.justNow
  return formatRelativeTime(updatedAt, new Date(now))
}

export function describeCharacterCount(strings: ChatStrings, length: number): string {
  return interpolate(strings.composer.count, {
    count: formatNumber(length),
    maximum: formatNumber(MESSAGE_MAX_LENGTH),
  })
}
