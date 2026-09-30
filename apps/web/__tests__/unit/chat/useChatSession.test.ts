import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CONVERSATION_ID, OTHER_CONVERSATION_ID } from '@/__tests__/fixtures/chat'
import { useChatSession } from '@/features/chat/hooks/useChatSession'

function setup(initial: string | null) {
  return renderHook(({ url }: { url: string | null }) => useChatSession(url), {
    initialProps: { url: initial },
  })
}

describe('useChatSession', () => {
  it('keeps its session while the URL stays put', () => {
    const { result, rerender } = setup(CONVERSATION_ID)
    rerender({ url: CONVERSATION_ID })
    expect(result.current).toMatchObject({ key: 0, conversationId: CONVERSATION_ID })
  })

  it('adopts a conversation it created when the URL swaps to it', () => {
    const { result, rerender } = setup(null)
    act(() => result.current.adopt(CONVERSATION_ID))
    rerender({ url: CONVERSATION_ID })
    expect(result.current).toMatchObject({ key: 0, conversationId: CONVERSATION_ID })
  })

  it('starts a fresh session for any other URL change', () => {
    const { result, rerender } = setup(null)
    rerender({ url: CONVERSATION_ID })
    expect(result.current).toMatchObject({ key: 1, conversationId: CONVERSATION_ID })
    rerender({ url: null })
    expect(result.current).toMatchObject({ key: 2, conversationId: null })
  })

  it('does not adopt when the URL moves somewhere else first', () => {
    const { result, rerender } = setup(null)
    act(() => result.current.adopt(CONVERSATION_ID))
    rerender({ url: OTHER_CONVERSATION_ID })
    expect(result.current).toMatchObject({ key: 1, conversationId: OTHER_CONVERSATION_ID })
  })
})
