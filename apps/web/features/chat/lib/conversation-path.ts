import { idSchema } from '@kb/contracts'

import { routes } from '@/core/config/routes'

const CONVERSATION_PATH_PREFIX = `${routes.chat.index}/`

/** Read from the URL because a new conversation swaps it in place (DEC-029). */
export function getConversationIdFromPath(pathname: string | null): string | null {
  if (!pathname?.startsWith(CONVERSATION_PATH_PREFIX)) return null
  const segment = pathname.slice(CONVERSATION_PATH_PREFIX.length)
  return idSchema.safeParse(segment).success ? segment : null
}
