import { useCallback, useState } from 'react'

interface ChatSessionState {
  /** Remount key of the thread: a new one abandons the old thread and its answer. */
  key: number
  conversationId: string | null
  /** A conversation the session created, until the URL shows it. */
  adopting: string | null
}

/**
 * Ties the thread to the URL: a conversation the session created is adopted in place, while
 * any other change (new chat, another conversation, back and forward) starts a fresh session.
 */
export function useChatSession(urlConversationId: string | null) {
  const [session, setSession] = useState<ChatSessionState>({
    key: 0,
    conversationId: urlConversationId,
    adopting: null,
  })

  // Adjusted while rendering, React's pattern for state that follows a changing input.
  if (urlConversationId !== session.conversationId) {
    const adopted = urlConversationId !== null && urlConversationId === session.adopting
    setSession({
      key: adopted ? session.key : session.key + 1,
      conversationId: urlConversationId,
      adopting: null,
    })
  }

  const adopt = useCallback((id: string) => {
    setSession((current) => ({ ...current, adopting: id }))
  }, [])

  return { key: session.key, conversationId: session.conversationId, adopt }
}
