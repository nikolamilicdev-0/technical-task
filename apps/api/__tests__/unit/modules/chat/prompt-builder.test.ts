import { describe, expect, it } from 'vitest'

import type { HistoryMessage, PromptSource } from '../../../../src/modules/chat/chat.types.js'
import { PromptBuilder, toConversationTurns } from '../../../../src/modules/chat/prompt-builder.js'
import {
  NO_SOURCES_NOTICE,
  SOURCES_HEADING,
  SYSTEM_RULES,
} from '../../../../src/modules/chat/prompt.constants.js'
import { WordCounter } from '../../../fakes/word-counter.js'
import { buildTestConfig } from '../../../fixtures.js'

// WordCounter counts words, so every budget below reads as a number of words.
function builder(contextTokens = 1_000, historyTokens = 1_000): PromptBuilder {
  const config = buildTestConfig({
    RAG_CONTEXT_TOKEN_BUDGET: String(contextTokens),
    RAG_HISTORY_TOKEN_BUDGET: String(historyTokens),
  })
  return new PromptBuilder(config, new WordCounter())
}

function source(key: string, words: number): PromptSource & { key: string } {
  return {
    key,
    documentTitle: 'Handbook',
    headingPath: `Handbook › ${key}`,
    content: Array.from({ length: words }, (_, index) => `${key}${index}`).join(' '),
  }
}

const user = (content: string): HistoryMessage => ({ role: 'user', content })
const assistant = (content: string): HistoryMessage => ({ role: 'assistant', content })

describe('PromptBuilder', () => {
  it('numbers the sources after the rules and ends with the question', () => {
    const { messages, sources } = builder().build({
      question: 'How do refunds work?',
      sources: [source('Refunds', 3), source('Plans', 2)],
      history: [],
    })

    expect(sources.map(({ key }) => key)).toEqual(['Refunds', 'Plans'])
    expect(messages).toEqual([
      {
        role: 'system',
        content: [
          SYSTEM_RULES,
          SOURCES_HEADING,
          '[1] «Handbook › Refunds»\nRefunds0 Refunds1 Refunds2',
          '[2] «Handbook › Plans»\nPlans0 Plans1',
        ].join('\n\n'),
      },
      { role: 'user', content: 'How do refunds work?' },
    ])
  })

  it('labels a source without headings with its document title', () => {
    const { messages } = builder().build({
      question: 'q',
      sources: [{ documentTitle: 'Notes', headingPath: '', content: 'Body' }],
      history: [],
    })

    expect(messages[0]?.content).toContain('[1] «Notes»\nBody')
  })

  it('drops whole sources that overflow the context budget and renumbers the rest', () => {
    // A block costs its content plus four words: "[n]" and the label «Handbook › key».
    const { messages, sources } = builder(16).build({
      question: 'q',
      sources: [source('a', 4), source('big', 20), source('c', 4)],
      history: [],
    })

    expect(sources.map(({ key }) => key)).toEqual(['a', 'c'])
    expect(messages[0]?.content).toContain('[2] «Handbook › c»')
    expect(messages[0]?.content).not.toContain('big0')
  })

  it('tells the model there is nothing to cite when no source fits or none was found', () => {
    for (const sources of [[], [source('huge', 50)]]) {
      const { messages, sources: included } = builder(10).build({
        question: 'q',
        sources,
        history: [],
      })

      expect(included).toEqual([])
      expect(messages[0]).toEqual({
        role: 'system',
        content: `${SYSTEM_RULES}\n\n${NO_SOURCES_NOTICE}`,
      })
    }
  })

  it('keeps the newest whole turns that fit the history budget, in order', () => {
    const history = [
      user('one two three'),
      assistant('four five six'),
      user('seven eight'),
      assistant('nine ten'),
      user('eleven'),
      assistant('twelve'),
    ]

    const { messages } = builder(1_000, 6).build({ question: 'Now?', sources: [], history })

    expect(messages.slice(1)).toEqual([
      user('seven eight'),
      assistant('nine ten'),
      user('eleven'),
      assistant('twelve'),
      user('Now?'),
    ])
  })

  it('stops at the first turn that no longer fits instead of skipping over it', () => {
    const history = [
      user('a'),
      assistant('b'),
      user('long '.repeat(10)),
      assistant('c'),
      user('d'),
      assistant('e'),
    ]

    const { messages } = builder(1_000, 5).build({ question: 'q', sources: [], history })

    expect(messages.slice(1, -1)).toEqual([user('d'), assistant('e')])
  })
})

describe('toConversationTurns', () => {
  it('pairs questions with their answers and drops questions left unanswered', () => {
    const turns = toConversationTurns([
      assistant('orphan answer'),
      user('failed question'),
      user('first'),
      assistant('first answer'),
      user('empty answer'),
      assistant('  '),
      user('pending'),
    ])

    expect(turns).toEqual([{ question: user('first'), answer: assistant('first answer') }])
  })
})
