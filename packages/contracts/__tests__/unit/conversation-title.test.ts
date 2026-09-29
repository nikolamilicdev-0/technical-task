import {
  CONVERSATION_TITLE_DERIVED_MAX,
  conversationTitleSchema,
  deriveConversationTitle,
} from '@kb/contracts'
import { describe, expect, it } from 'vitest'

const MAX = CONVERSATION_TITLE_DERIVED_MAX

describe('deriveConversationTitle', () => {
  it.each([
    ['keeps a short question', 'What is RAG?', 'What is RAG?'],
    ['trims surrounding whitespace', '   padded   ', 'padded'],
    ['collapses inner whitespace', 'many    spaces\tand\t\ttabs', 'many spaces and tabs'],
    ['uses only the first line', 'First line\nSecond line', 'First line'],
    ['skips leading blank lines', '\n\n   Real question\nmore', 'Real question'],
    ['splits on CRLF', 'Windows line\r\nnext', 'Windows line'],
    ['splits on bare CR', 'Classic Mac\rnext', 'Classic Mac'],
    ['keeps a title of exactly the limit', 'x'.repeat(MAX), 'x'.repeat(MAX)],
    [
      'cuts at the last word boundary within the limit',
      'How do I configure the ingestion worker to retry failed documents with backoff?',
      'How do I configure the ingestion worker to retry failed',
    ],
    ['uses the full limit when a space follows it', `${'x'.repeat(MAX)} tail`, 'x'.repeat(MAX)],
    ['hard-cuts a single long word', 'a'.repeat(MAX + 20), 'a'.repeat(MAX)],
  ])('%s', (_, input, expected) => {
    expect(deriveConversationTitle(input)).toBe(expected)
  })

  it.each([
    ['an empty string', ''],
    ['whitespace only', ' \n\t \r\n '],
  ])('returns null for %s', (_, input) => {
    expect(deriveConversationTitle(input)).toBeNull()
  })

  it.each([
    ['emoji', '😀'.repeat(MAX + 10)],
    ['emoji at the cut point', `${'a'.repeat(MAX - 1)}😀😀`],
  ])('counts code points and never splits a surrogate pair (%s)', (_, input) => {
    const title = deriveConversationTitle(input) ?? ''
    expect(Array.from(title)).toHaveLength(MAX)
    expect(() => encodeURIComponent(title)).not.toThrow()
  })

  it.each([
    'Summarise the onboarding handbook and list every deadline mentioned in it, please',
    `${'word '.repeat(40)}end`,
    'Short',
  ])('always yields a valid stored conversation title: %s', (input) => {
    const title = deriveConversationTitle(input)
    expect(title).not.toBeNull()
    expect(Array.from(title ?? '').length).toBeLessThanOrEqual(MAX)
    expect(conversationTitleSchema.parse(title)).toBe(title)
  })
})
