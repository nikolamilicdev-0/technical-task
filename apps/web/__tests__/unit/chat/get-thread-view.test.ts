// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { getThreadView } from '@/features/chat/lib/get-thread-view'
import type { ThreadViewInput } from '@/features/chat/types'

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
