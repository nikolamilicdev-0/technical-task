import { idSchema } from '@kb/contracts'

import { routes } from '@/core/config/routes'

const CONVERSATION_PATH_PREFIX = `${routes.chat.index}/`

/**
 * The conversation a `/chat/<id>` path names; null for `/chat` itself and any other path. The
 * thread reads it from the URL because a new conversation swaps the URL in place.
 */
export function getConversationIdFromPath(pathname: string | null): string | null {
  if (!pathname?.startsWith(CONVERSATION_PATH_PREFIX)) return null
  const segment = pathname.slice(CONVERSATION_PATH_PREFIX.length)
  return idSchema.safeParse(segment).success ? segment : null
}
