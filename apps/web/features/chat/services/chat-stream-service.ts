import { apiRoutes, type SendMessageInput } from '@kb/contracts'

import { getApiClient } from '@/core/api/browser-client'

export const chatStreamService = {
  /**
   * Asks a question; resolves with the open response once the API accepted it, so its body is
   * the answer's event stream. Rejections before that (429, 404, offline) are ApiErrors.
   */
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
