import type { ChatErrorEvent } from '@kb/contracts'

import { ApiHttpException } from '../../common/errors/api-http.exception.js'
import { mapErrorToResponse } from '../../common/errors/error-mapping.js'
import { CONVERSATION_NOT_FOUND_MESSAGE } from './chat.constants.js'

export function toChatErrorEvent(error: unknown): ChatErrorEvent {
  const { body } = mapErrorToResponse(error)
  return {
    type: 'error',
    code: body.code,
    message: body.messages.join(' '),
    ...(body.retryAfter === undefined ? {} : { retryAfter: body.retryAfter }),
  }
}

export function toApiException({ code, message, retryAfter }: ChatErrorEvent): ApiHttpException {
  return new ApiHttpException(code, [message], retryAfter === undefined ? {} : { retryAfter })
}

export function conversationNotFound(): ApiHttpException {
  return new ApiHttpException('not_found', [CONVERSATION_NOT_FOUND_MESSAGE])
}
