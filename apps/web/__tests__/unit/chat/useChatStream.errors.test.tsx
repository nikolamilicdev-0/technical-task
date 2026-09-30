import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DETAIL_KEY,
  delta,
  DONE,
  jsonResponse,
  META,
  QUESTION,
  renderChatStream,
  requestBody,
  sseResponse,
} from '@/__tests__/helpers/chat-stream'
import { handleUnauthorized } from '@/core/api/handle-unauthorized'

const fetchMock = vi.hoisted(() => vi.fn<typeof fetch>())

vi.mock('@/core/api/browser-client', async () => {
  const { createApiClient } = await import('@/core/api/client')
  const client = createApiClient({
    baseUrl: 'http://api.test',
    getAccessToken: () => Promise.resolve('token'),
    fetch: fetchMock,
  })
  return { getApiClient: () => client }
})
vi.mock('@/core/api/handle-unauthorized', () => ({
  handleUnauthorized: vi.fn(() => Promise.resolve()),
  refreshSessionOnce: vi.fn(() => Promise.resolve(false)),
}))

beforeEach(() => {
  fetchMock.mockReset()
})

describe('useChatStream failures', () => {
  it('an error frame fails the answer and keeps the question for a retry', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        META,
        delta('Part'),
        { type: 'error', code: 'ai_provider_error', message: 'Upstream failed' },
      ])
    )
    const { result, detail, isInvalidated } = renderChatStream()

    act(() => void result.current.send(QUESTION))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state.error).toEqual({
      code: 'ai_provider_error',
      message: 'Upstream failed',
      retryAfter: null,
    })
    expect(result.current.state.pendingUserMessage?.content).toBe(QUESTION)
    expect(detail()?.messages).toEqual([])
    // The API stored the question before failing, so its copy is fetched.
    expect(isInvalidated(DETAIL_KEY)).toBe(true)

    fetchMock.mockResolvedValueOnce(sseResponse([META, delta('Done.'), DONE]))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.state.status).toBe('done'))
    expect(requestBody(fetchMock, 1)).toEqual({ content: QUESTION })
  })

  it('reports when a rate-limited question can be sent again and commits nothing', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 'rate_limited', messages: ['Too many requests'] }, 429, {
        'Retry-After': '12',
      })
    )
    const { result, detail } = renderChatStream()

    act(() => void result.current.send(QUESTION))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state.error).toEqual({
      code: 'rate_limited',
      message: 'Too many requests',
      retryAfter: 12,
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(detail()?.messages).toEqual([])
  })

  it('reports a stream that ends before its answer was stored as interrupted', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([META, delta('Half')]))
    const { result } = renderChatStream()

    act(() => void result.current.send(QUESTION))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state.error?.code).toBe('interrupted')
  })

  it('signs out when the API rejects the session', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: 'unauthenticated', messages: [] }, 401))
    const { result } = renderChatStream()

    act(() => void result.current.send(QUESTION))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(handleUnauthorized).toHaveBeenCalledOnce()
  })
})
