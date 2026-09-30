import { apiRoutes, type SendMessageInput } from '@kb/contracts'

import { getApiClient } from '@/core/api/browser-client'

export const chatStreamService = {
  /** Resolves once the API accepted the question; earlier failures (429, 404, offline) reject. */
  sendMessage: (
    conversationId: string,
    input: SendMessageInput,
    signal: AbortSignal
  ): Promise<Response> =>
    getApiClient().stream(apiRoutes.conversations.messages(conversationId), {
      body: input,
      signal,
    }),
}
