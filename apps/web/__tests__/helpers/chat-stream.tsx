import type { ChatSseEvent, ConversationDetail, Message } from '@kb/contracts'
import { type QueryKey, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { type Mock, vi } from 'vitest'

import {
  ASSISTANT_MESSAGE_ID,
  buildCitations,
  buildConversation,
  buildConversationDetail,
  buildConversationList,
  buildMessage,
  CONVERSATION_ID,
  sseFrame,
  USER_MESSAGE_ID,
} from '@/__tests__/fixtures/chat'
import { CONVERSATIONS_LIST_PARAMS } from '@/features/chat/constants'
import { useChatStream } from '@/features/chat/hooks/useChatStream'
import { useConversation } from '@/features/chat/hooks/useConversation'
import { conversationsKeys } from '@/features/chat/lib/conversations-keys'
import { usageKeys } from '@/features/usage/lib/usage-keys'

export type FetchMock = Mock<typeof fetch>

export const QUESTION = 'How do I set up?'
export const DETAIL_KEY = conversationsKeys.detail(CONVERSATION_ID)
export const LIST_KEY = conversationsKeys.list(CONVERSATIONS_LIST_PARAMS)
export const USAGE_KEY = [...usageKeys.all, 'summary']
export const EARLIER = buildMessage({ id: 'aaaaaaaa-0000-4000-8000-000000000001', content: 'Hi' })

export const META = {
  type: 'meta',
  conversationId: CONVERSATION_ID,
  userMessageId: USER_MESSAGE_ID,
  title: QUESTION,
} as const satisfies ChatSseEvent
export const SOURCES = {
  type: 'sources',
  citations: buildCitations(2),
} as const satisfies ChatSseEvent
export const USAGE = {
  type: 'usage',
  promptTokens: 200,
  completionTokens: 12,
  totalTokens: 212,
  model: 'gemini-3.5-flash-lite',
  estimated: false,
} as const satisfies ChatSseEvent
export const DONE = {
  type: 'done',
  userMessageId: USER_MESSAGE_ID,
  assistantMessageId: ASSISTANT_MESSAGE_ID,
  finishReason: 'stop',
} as const satisfies ChatSseEvent

export const delta = (text: string): ChatSseEvent => ({ type: 'delta', text })

const encoder = new TextEncoder()
const SSE_INIT = { headers: { 'Content-Type': 'text/event-stream' } }

export function sseResponse(events: ChatSseEvent[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      events.forEach((event) => controller.enqueue(encoder.encode(sseFrame(event))))
      controller.close()
    },
  })
  return new Response(body, SSE_INIT)
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

/** An answer the test writes frame by frame; aborting the request errors its body, as fetch does. */
export function scriptStream(fetchMock: FetchMock) {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  let requestSignal: AbortSignal | undefined
  const body = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController
    },
  })
  fetchMock.mockImplementationOnce((_input, init) => {
    requestSignal = init?.signal ?? undefined
    requestSignal?.addEventListener('abort', () =>
      controller?.error(new DOMException('The operation was aborted.', 'AbortError'))
    )
    return Promise.resolve(new Response(body, SSE_INIT))
  })
  return {
    push: (...events: ChatSseEvent[]) =>
      events.forEach((event) => controller?.enqueue(encoder.encode(sseFrame(event)))),
    close: () => controller?.close(),
    aborted: () => requestSignal?.aborted ?? false,
  }
}

export function requestBody(fetchMock: FetchMock, call: number): unknown {
  const body = fetchMock.mock.calls[call]?.[1]?.body
  return typeof body === 'string' ? JSON.parse(body) : undefined
}

interface RenderChatStreamOptions {
  conversationId?: string | null
  history?: Message[]
  /** Mounts the conversation query as the thread does, so an invalidation can refetch it. */
  observeDetail?: boolean
}

export function renderChatStream({
  conversationId = CONVERSATION_ID,
  history = [],
  observeDetail = false,
}: RenderChatStreamOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  if (conversationId) {
    queryClient.setQueryData(
      conversationsKeys.detail(conversationId),
      buildConversationDetail(history)
    )
  }
  queryClient.setQueryData(LIST_KEY, buildConversationList([buildConversation()]))
  queryClient.setQueryData(USAGE_KEY, { requests: 1 })
  const onConversationCreated = vi.fn()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const hook = renderHook(
    () => {
      useConversation(observeDetail ? conversationId : null, { streaming: false })
      return useChatStream(conversationId, onConversationCreated)
    },
    { wrapper }
  )
  const detail = (id = conversationId ?? '') =>
    queryClient.getQueryData<ConversationDetail>(conversationsKeys.detail(id))
  const isInvalidated = (key: QueryKey) => queryClient.getQueryState(key)?.isInvalidated
  return { ...hook, queryClient, detail, isInvalidated, onConversationCreated }
}
