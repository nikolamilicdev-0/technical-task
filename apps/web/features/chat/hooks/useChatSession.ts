import { useCallback, useState } from 'react'

interface ChatSessionState {
  key: number
  conversationId: string | null
  /** A conversation the session created, until the URL shows it. */
  adopting: string | null
}

/** Adopts a conversation it created in place; any other URL change starts a fresh session. */
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
