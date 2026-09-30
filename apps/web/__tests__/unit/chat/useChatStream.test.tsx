import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ASSISTANT_MESSAGE_ID,
  buildConversation,
  CONVERSATION_ID,
  OTHER_CONVERSATION_ID,
  USER_MESSAGE_ID,
} from '@/__tests__/fixtures/chat'
import { DOCUMENT_ID } from '@/__tests__/fixtures/documents'
import {
  DETAIL_KEY,
  delta,
  DONE,
  EARLIER,
  jsonResponse,
  LIST_KEY,
  META,
  QUESTION,
  renderChatStream,
  requestBody,
  scriptStream,
  SOURCES,
  sseResponse,
  USAGE,
  USAGE_KEY,
} from '@/__tests__/helpers/chat-stream'

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

beforeEach(() => {
  fetchMock.mockReset()
})

describe('useChatStream', () => {
  it('streams the answer, then commits the stored exchange to the conversation cache', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([META, SOURCES, delta('Install '), delta('the CLI [1].'), USAGE, DONE])
    )
    const { result, detail, isInvalidated } = renderChatStream({ history: [EARLIER] })

    act(() => void result.current.send(`  ${QUESTION}  `))
    await waitFor(() => expect(detail()?.messages).toHaveLength(3))

    const [, question, answer] = detail()?.messages ?? []
    expect(question).toMatchObject({ id: USER_MESSAGE_ID, role: 'user', content: QUESTION })
    expect(answer).toMatchObject({
      id: ASSISTANT_MESSAGE_ID,
      content: 'Install the CLI [1].',
      finishReason: 'stop',
      model: USAGE.model,
      usage: { promptTokens: 200, completionTokens: 12, totalTokens: 212, estimated: false },
    })
    expect(answer?.citations.map((citation) => citation.cited)).toEqual([true, false])
    expect(result.current.state.status).toBe('done')
    expect(isInvalidated(LIST_KEY)).toBe(true)
    expect(isInvalidated(USAGE_KEY)).toBe(true)
    expect(isInvalidated(DETAIL_KEY)).toBe(false)
  })

  it('asks the conversation with an event-stream request and the chosen scope', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([META, DONE]))
    const { result } = renderChatStream()

    act(() => void result.current.send(QUESTION, [DOCUMENT_ID]))
    await waitFor(() => expect(result.current.state.status).toBe('done'))

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(`http://api.test/api/conversations/${CONVERSATION_ID}/messages`)
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Accept')).toBe('text/event-stream')
    expect(requestBody(fetchMock, 0)).toEqual({ content: QUESTION, documentIds: [DOCUMENT_ID] })
  })

  it('shows the draft while tokens arrive', async () => {
    const stream = scriptStream(fetchMock)
    const { result } = renderChatStream()

    act(() => void result.current.send(QUESTION))
    expect(result.current.state.status).toBe('connecting')
    stream.push(META, delta('Install'))
    await waitFor(() => expect(result.current.state.draft).toBe('Install'))
    expect(result.current.state.status).toBe('streaming')

    stream.push(delta(' it.'), DONE)
    stream.close()
    await waitFor(() => expect(result.current.state.status).toBe('done'))
    expect(result.current.state.draft).toBe('Install it.')
  })

  it('ignores a second question while an answer is on its way', async () => {
    scriptStream(fetchMock)
    const { result } = renderChatStream()

    let accepted = { first: false, second: true }
    act(() => {
      accepted = { ...accepted, first: result.current.send(QUESTION) }
    })
    act(() => {
      accepted = { ...accepted, second: result.current.send('Another question') }
    })
    expect(accepted).toEqual({ first: true, second: false })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(result.current.state.pendingUserMessage?.content).toBe(QUESTION)
  })

  it('stop() aborts, keeps the partial answer as aborted and refetches the stored copy', async () => {
    const stream = scriptStream(fetchMock)
    const { result, detail, isInvalidated } = renderChatStream()

    act(() => void result.current.send(QUESTION))
    stream.push(META, SOURCES, delta('Install the'))
    await waitFor(() => expect(result.current.state.draft).toBe('Install the'))

    act(() => result.current.stop())
    expect(result.current.state.status).toBe('stopped')
    expect(stream.aborted()).toBe(true)
    await waitFor(() => expect(detail()?.messages).toHaveLength(2))
    expect(detail()?.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Install the',
      finishReason: 'aborted',
    })
    expect(isInvalidated(DETAIL_KEY)).toBe(true)
  })

  it('unmounting mid-answer aborts the request and keeps the partial answer', async () => {
    const stream = scriptStream(fetchMock)
    const { result, unmount, detail } = renderChatStream()

    act(() => void result.current.send(QUESTION))
    stream.push(META, delta('Half'))
    await waitFor(() => expect(result.current.state.draft).toBe('Half'))

    unmount()
    expect(stream.aborted()).toBe(true)
    await waitFor(() => expect(detail()?.messages).toHaveLength(2))
    expect(detail()?.messages[1]).toMatchObject({ content: 'Half', finishReason: 'aborted' })
  })

  it('creates the conversation for a first question and swaps the URL in place', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
    const created = buildConversation({ id: OTHER_CONVERSATION_ID, title: QUESTION })
    fetchMock.mockResolvedValueOnce(jsonResponse(created, 201))
    fetchMock.mockResolvedValueOnce(
      sseResponse([{ ...META, conversationId: OTHER_CONVERSATION_ID }, delta('Hi'), DONE])
    )
    const { result, detail, onConversationCreated, isInvalidated } = renderChatStream({
      conversationId: null,
    })

    act(() => void result.current.send(QUESTION))
    await waitFor(() => expect(result.current.conversationId).toBe(OTHER_CONVERSATION_ID))
    await waitFor(() => expect(detail(OTHER_CONVERSATION_ID)?.messages).toHaveLength(2))

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/api/conversations')
    expect(requestBody(fetchMock, 0)).toEqual({ title: QUESTION })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `http://api.test/api/conversations/${OTHER_CONVERSATION_ID}/messages`
    )
    expect(onConversationCreated).toHaveBeenCalledWith(OTHER_CONVERSATION_ID)
    expect(replaceState).toHaveBeenCalledWith(null, '', `/chat/${OTHER_CONVERSATION_ID}`)
    // The session learns about the new conversation before the URL shows it.
    expect(onConversationCreated.mock.invocationCallOrder[0]).toBeLessThan(
      replaceState.mock.invocationCallOrder[0] ?? 0
    )
    expect(isInvalidated(LIST_KEY)).toBe(true)
    replaceState.mockRestore()
  })
})
