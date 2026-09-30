// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { buildCitation } from '@/__tests__/fixtures/chat'
import {
  describeCharacterCount,
  describeFinish,
  describeIndexing,
  describeProgress,
  describeScope,
  describeSources,
  describeStreamError,
  describeThreadTitle,
  describeUsage,
  formatConversationTime,
  getChatStrings,
} from '@/features/chat/lib/chat-strings'
import type { StreamError } from '@/features/chat/types'
import en from '@/messages/en.json'

const strings = getChatStrings(en)
const error = (overrides: Partial<StreamError>): StreamError => ({
  code: 'internal_error',
  message: null,
  retryAfter: null,
  ...overrides,
})

describe('describeStreamError', () => {
  it('says when a rate-limited user can send again', () => {
    expect(describeStreamError(en, error({ code: 'rate_limited', retryAfter: 12 }))).toBe(
      "You've sent a lot of messages in a short time. Try again in 12 s."
    )
  })

  it('falls back to the generic rate-limit copy without a delay', () => {
    expect(describeStreamError(en, error({ code: 'rate_limited' }))).toBe(
      en.errors.codes.rate_limited
    )
  })

  it('explains an unavailable provider with its retry delay', () => {
    const unavailable = error({ code: 'ai_provider_unavailable', retryAfter: 30 })
    expect(describeStreamError(en, unavailable)).toContain('30 s')
  })

  it('has chat copy for dropped connections and deleted conversations', () => {
    expect(describeStreamError(en, error({ code: 'interrupted' }))).toBe(strings.errors.interrupted)
    expect(describeStreamError(en, error({ code: 'not_found' }))).toBe(
      strings.errors.conversationGone
    )
    expect(describeStreamError(en, error({ code: 'network' }))).toBe(en.errors.network)
  })

  it('uses the shared copy for every other code', () => {
    expect(describeStreamError(en, error({ code: 'ai_provider_error', message: 'raw' }))).toBe(
      en.errors.codes.ai_provider_error
    )
  })
})

describe('describeSources', () => {
  it('counts the sources and how many the answer cites', () => {
    const citations = [buildCitation({ cited: true }), buildCitation({ index: 2 })]
    expect(describeSources(strings, citations)).toBe('2 sources · 1 cited')
  })

  it('leaves out the cited count when nothing is cited', () => {
    expect(describeSources(strings, [buildCitation()])).toBe('1 source')
  })
})

describe('describeUsage', () => {
  it('formats reported and estimated token counts', () => {
    const usage = { promptTokens: 1000, completionTokens: 234, totalTokens: 1234 }
    expect(describeUsage(strings, { ...usage, estimated: false })).toBe('1,234 tokens')
    expect(describeUsage(strings, { ...usage, estimated: true })).toBe('About 1,234 tokens')
  })
})

describe('describeIndexing', () => {
  it('describes documents still indexing and failed ones', () => {
    const summary = { indexing: 2, failed: [{ id: 'a', title: 'Scan' }], ready: [], total: 3 }
    expect(describeIndexing(strings, summary)).toEqual({
      indexing: "2 documents are still being indexed, so answers can't use them yet.",
      failed: "1 document couldn't be indexed and is left out:",
    })
  })

  it('says nothing when every document is ready', () => {
    expect(describeIndexing(strings, { indexing: 0, failed: [], ready: [], total: 1 })).toEqual({
      indexing: null,
      failed: null,
    })
  })
})

describe('formatConversationTime', () => {
  const now = Date.parse('2026-09-30T12:00:00.000Z')

  it('reads recent activity as just now, older activity relatively', () => {
    expect(formatConversationTime(strings, '2026-09-30T11:59:30.000Z', now)).toBe('just now')
    expect(formatConversationTime(strings, '2026-09-30T09:00:00.000Z', now)).toBe('3 hours ago')
  })
})

describe('describeCharacterCount', () => {
  it('shows the length against the limit', () => {
    expect(describeCharacterCount(strings, 3650)).toBe('3,650 / 4,000')
  })
})

describe('describeProgress', () => {
  it('searches until sources arrive, then reads them', () => {
    expect(describeProgress(strings, [])).toBe(strings.message.searching)
    expect(describeProgress(strings, [buildCitation(), buildCitation({ index: 2 })])).toBe(
      'Reading 2 sources…'
    )
  })
})

describe('describeFinish', () => {
  it('explains answers that ended early and stays quiet otherwise', () => {
    expect(describeFinish(strings, 'aborted')).toBe(strings.message.finish.aborted)
    expect(describeFinish(strings, 'length')).toBe(strings.message.finish.length)
    expect(describeFinish(strings, 'stop')).toBeNull()
    expect(describeFinish(strings, 'unknown')).toBeNull()
    expect(describeFinish(strings, undefined)).toBeNull()
  })
})

describe('describeThreadTitle', () => {
  it('names the thread after its conversation, or as a new chat before one exists', () => {
    expect(describeThreadTitle(strings, 'messages', { saved: true, title: 'Setup' })).toBe('Setup')
    expect(describeThreadTitle(strings, 'messages', { saved: true, title: null })).toBe(
      strings.untitled
    )
    expect(describeThreadTitle(strings, 'empty', { saved: false, title: undefined })).toBe(
      strings.newChat
    )
  })

  it('leaves a placeholder while loading and a generic title when nothing loaded', () => {
    expect(describeThreadTitle(strings, 'loading', { saved: true, title: undefined })).toBeNull()
    expect(describeThreadTitle(strings, 'notFound', { saved: true, title: 'Old' })).toBe(
      strings.title
    )
  })
})

describe('describeScope', () => {
  it('reads as every document until some are picked', () => {
    expect(describeScope(strings, 0)).toBe('All documents')
    expect(describeScope(strings, 1)).toBe('1 document')
    expect(describeScope(strings, 3)).toBe('3 documents')
  })
})
