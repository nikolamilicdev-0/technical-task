import type { ChatDoneEvent, ConversationDetail } from '@kb/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { handleUnauthorized } from '@/core/api/handle-unauthorized'
import { routes } from '@/core/config/routes'
import { createTempId } from '@/core/utils/ids'
import { useCreateConversation } from '@/features/chat/hooks/useConversationMutations'
import {
  chatStreamReducer,
  INITIAL_CHAT_STREAM_STATE,
  isReceiving,
  toStreamAction,
} from '@/features/chat/lib/chat-stream-reducer'
import { appendExchange } from '@/features/chat/lib/commit-stream-result'
import { conversationsKeys } from '@/features/chat/lib/conversations-keys'
import { newConversationInput } from '@/features/chat/lib/derive-title'
import { parseChatEvent } from '@/features/chat/lib/parse-chat-event'
import { parseSse } from '@/features/chat/lib/parse-sse'
import {
  fromErrorEvent,
  INTERRUPTED_STREAM_ERROR,
  toStreamError,
} from '@/features/chat/lib/to-stream-error'
import { chatStreamService } from '@/features/chat/services/chat-stream-service'
import type { ChatStreamAction, ChatStreamState, StreamError } from '@/features/chat/types'
import { usageKeys } from '@/features/usage/lib/usage-keys'

interface StreamRun {
  controller: AbortController
  conversationId: string | null
}

/** A first question creates its conversation and swaps the URL in place (DEC-029). */
export function useChatStream(
  initialConversationId: string | null,
  onConversationCreated?: (id: string) => void
) {
  const queryClient = useQueryClient()
  const createConversation = useCreateConversation()
  const [state, setState] = useState<ChatStreamState>(INITIAL_CHAT_STREAM_STATE)
  const [conversationId, setConversationId] = useState(initialConversationId)
  // The async loop reads the state it just dispatched, which a render has not delivered yet.
  const stateRef = useRef(state)
  const conversationIdRef = useRef(initialConversationId)
  const runRef = useRef<StreamRun | null>(null)

  const dispatch = useCallback((action: ChatStreamAction) => {
    stateRef.current = chatStreamReducer(stateRef.current, action)
    setState(stateRef.current)
  }, [])

  const commit = useCallback(
    async (id: string, done: ChatDoneEvent | null, snapshot: ChatStreamState) => {
      const detailKey = conversationsKeys.detail(id)
      const result = {
        state: snapshot,
        done,
        placeholderIds: { question: createTempId(), answer: createTempId() },
        settledAt: new Date().toISOString(),
      }
      // A fetch still in flight would otherwise land after the commit and drop the exchange.
      await queryClient.cancelQueries({ queryKey: detailKey })
      queryClient.setQueryData<ConversationDetail>(detailKey, (detail) =>
        appendExchange(detail, result)
      )
      void queryClient.invalidateQueries({ queryKey: conversationsKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: usageKeys.all })
      // A stopped answer is stored only after the API notices the abort; refetching now could
      // replace the partial answer with a copy that lacks it, so the next mount or focus reloads.
      if (!done) void queryClient.invalidateQueries({ queryKey: detailKey, refetchType: 'none' })
    },
    [queryClient]
  )

  const interrupt = useCallback(() => {
    const run = runRef.current
    if (!run) return
    runRef.current = null
    run.controller.abort()
    if (run.conversationId) void commit(run.conversationId, null, stateRef.current)
  }, [commit])

  useEffect(() => interrupt, [interrupt])

  const fail = (run: StreamRun, error: StreamError) => {
    runRef.current = null
    dispatch({ type: 'fail', error })
    if (error.code === 'unauthenticated') void handleUnauthorized()
    if (!run.conversationId) return
    void queryClient.invalidateQueries({ queryKey: conversationsKeys.lists() })
    // The API stores a question before answering it: show the copy it kept.
    if (stateRef.current.meta) {
      void queryClient.invalidateQueries({ queryKey: conversationsKeys.detail(run.conversationId) })
    }
  }

  const ensureConversation = async (run: StreamRun, question: string) => {
    if (run.conversationId) return run.conversationId
    const conversation = await createConversation.mutateAsync(newConversationInput(question))
    if (runRef.current !== run) return null
    run.conversationId = conversation.id
    conversationIdRef.current = conversation.id
    setConversationId(conversation.id)
    onConversationCreated?.(conversation.id)
    window.history.replaceState(null, '', routes.chat.conversation(conversation.id))
    return conversation.id
  }

  const ask = async (question: string, documentIds?: string[]) => {
    const run: StreamRun = {
      controller: new AbortController(),
      conversationId: conversationIdRef.current,
    }
    runRef.current = run
    dispatch({
      type: 'start',
      message: { content: question, documentIds, createdAt: new Date().toISOString() },
    })
    try {
      const id = await ensureConversation(run, question)
      if (!id) return
      const response = await chatStreamService.sendMessage(
        id,
        { content: question, documentIds },
        run.controller.signal
      )
      if (!response.body) {
        fail(run, INTERRUPTED_STREAM_ERROR)
        return
      }
      for await (const message of parseSse(response.body)) {
        if (runRef.current !== run) return
        const event = parseChatEvent(message)
        if (!event) continue
        if (event.type === 'error') {
          fail(run, fromErrorEvent(event))
          return
        }
        dispatch(toStreamAction(event))
        if (event.type === 'done') {
          runRef.current = null
          await commit(id, event, stateRef.current)
          return
        }
      }
      if (runRef.current === run) fail(run, INTERRUPTED_STREAM_ERROR)
    } catch (error) {
      // An interrupted run was committed by whoever interrupted it.
      if (runRef.current === run) fail(run, toStreamError(error))
    }
  }

  const send = (content: string, documentIds?: string[]): boolean => {
    const question = content.trim()
    if (question === '' || isReceiving(stateRef.current.status)) return false
    void ask(question, documentIds)
    return true
  }

  const stop = () => {
    if (!runRef.current) return
    dispatch({ type: 'stop' })
    interrupt()
  }

  const retry = () => {
    const { status, pendingUserMessage } = stateRef.current
    if (status !== 'error' || !pendingUserMessage) return
    void ask(pendingUserMessage.content, pendingUserMessage.documentIds)
  }

  return { state, conversationId, send, stop, retry }
}
