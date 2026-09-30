// @vitest-environment node
import type { MessageRole } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { NO_CITATIONS } from '@/features/chat/constants'
import { endsOnStoppedQuestion, getThreadView } from '@/features/chat/lib/get-thread-view'
import type { MessageItem, ThreadViewInput } from '@/features/chat/types'

const input = (overrides: Partial<ThreadViewInput>): ThreadViewInput => ({
  saved: true,
  hasData: true,
  isError: false,
  notFound: false,
  itemCount: 2,
  ...overrides,
})

describe('getThreadView', () => {
  it('shows the messages of a loaded conversation', () => {
    expect(getThreadView(input({}))).toBe('messages')
  })

  it('loads, or fails, while a saved conversation has no data yet', () => {
    expect(getThreadView(input({ hasData: false }))).toBe('loading')
    expect(getThreadView(input({ hasData: false, isError: true }))).toBe('error')
  })

  it('keeps showing cached messages when a background refetch fails', () => {
    expect(getThreadView(input({ isError: true }))).toBe('messages')
  })

  it('reports a missing conversation even when an old copy is cached', () => {
    expect(getThreadView(input({ notFound: true }))).toBe('notFound')
  })

  it('is empty for a new chat until its first question appears', () => {
    expect(getThreadView(input({ saved: false, hasData: false, itemCount: 0 }))).toBe('empty')
    expect(getThreadView(input({ saved: false, hasData: false, itemCount: 2 }))).toBe('messages')
  })
})

const item = (key: string, author: MessageRole): MessageItem => ({
  key,
  author,
  content: 'text',
  citations: NO_CITATIONS,
  streaming: false,
})

describe('endsOnStoppedQuestion', () => {
  const question = item('q2', 'user')
  const history = [item('q1', 'user'), item('a1', 'assistant')]

  it('holds when a stopped answer left the thread ending on its question', () => {
    expect(endsOnStoppedQuestion('stopped', [...history, question])).toBe(true)
  })

  it('leaves partial answers, other statuses and empty threads to their own notes', () => {
    const partial = [...history, question, item('a2', 'assistant')]
    expect(endsOnStoppedQuestion('stopped', partial)).toBe(false)
    expect(endsOnStoppedQuestion('error', [...history, question])).toBe(false)
    expect(endsOnStoppedQuestion('streaming', [...history, question])).toBe(false)
    expect(endsOnStoppedQuestion('stopped', [])).toBe(false)
  })
})
