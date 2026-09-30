import { MESSAGE_MAX_LENGTH } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import {
  QUERY_REWRITE_HISTORY_MESSAGES,
  QUERY_REWRITE_MESSAGE_MAX_TOKENS,
} from '../../../../src/modules/chat/chat.constants.js'
import { QUERY_REWRITE_INSTRUCTIONS } from '../../../../src/modules/chat/prompt.constants.js'
import {
  buildRewriteMessages,
  cleanRewrittenQuery,
} from '../../../../src/modules/chat/rewrite-prompt.js'
import { WordCounter } from '../../../fakes/word-counter.js'

const counter = new WordCounter()

describe('buildRewriteMessages', () => {
  it('shows the conversation one line per message, then the follow-up', () => {
    const messages = buildRewriteMessages(
      'what about its pricing?',
      [
        { role: 'user', content: 'What is the Pro plan?' },
        { role: 'assistant', content: 'The Pro plan\n\nadds SSO [1].' },
      ],
      counter
    )

    expect(messages).toEqual([
      { role: 'system', content: QUERY_REWRITE_INSTRUCTIONS },
      {
        role: 'user',
        content: [
          'Conversation:',
          'User: What is the Pro plan?',
          'Assistant: The Pro plan adds SSO [1].',
          '',
          'Follow-up question: what about its pricing?',
        ].join('\n'),
      },
    ])
  })

  it('keeps only the latest messages and clips long ones', () => {
    const history = Array.from({ length: QUERY_REWRITE_HISTORY_MESSAGES + 2 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `message-${index} ${'word '.repeat(QUERY_REWRITE_MESSAGE_MAX_TOKENS)}`,
    }))

    const [, prompt] = buildRewriteMessages('q', history, counter)

    expect(prompt?.content).not.toContain('message-1 ')
    expect(prompt?.content).toContain('message-2 ')
    expect(prompt?.content.split('\n')[1]?.endsWith('word…')).toBe(true)
  })
})

describe('cleanRewrittenQuery', () => {
  it.each([
    ['plain text', 'Pro plan pricing', 'Pro plan pricing'],
    ['quotes', '"Pro plan pricing"', 'Pro plan pricing'],
    ['a label', 'Standalone query: Pro plan pricing', 'Pro plan pricing'],
    ['a label and quotes', 'Query: “Pro plan pricing”', 'Pro plan pricing'],
    ['extra lines', '  Pro plan   pricing \nBecause the user asked…', 'Pro plan pricing'],
  ])('reads %s', (_, text, query) => {
    expect(cleanRewrittenQuery(text)).toBe(query)
  })

  it.each(['', '  \n ', '""'])('gives null for %o', (text) => {
    expect(cleanRewrittenQuery(text)).toBeNull()
  })

  it('caps the query at the message length limit', () => {
    expect(cleanRewrittenQuery('x'.repeat(MESSAGE_MAX_LENGTH + 5))).toHaveLength(MESSAGE_MAX_LENGTH)
  })
})
