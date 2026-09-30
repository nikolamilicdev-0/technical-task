import { AiProviderError } from '@kb/ai'
import { describe, expect, it } from 'vitest'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import { toApiException, toChatErrorEvent } from '../../../../src/modules/chat/chat-errors.js'

describe('toChatErrorEvent', () => {
  it('carries the retry hint of a transient provider failure', () => {
    const error = new AiProviderError('rate_limited', 'Slow down', {
      provider: 'gemini',
      retryAfterSeconds: 12,
    })

    expect(toChatErrorEvent(error)).toEqual({
      type: 'error',
      code: 'ai_provider_unavailable',
      message: 'The AI provider is temporarily unavailable; try again shortly',
      retryAfter: 12,
    })
  })

  it('never exposes the details of an unexpected failure', () => {
    expect(toChatErrorEvent(new Error('connection string leaked'))).toEqual({
      type: 'error',
      code: 'internal_error',
      message: 'Unexpected server error',
    })
  })
})

describe('toApiException', () => {
  it('turns an error event back into the exception with its status and retry hint', () => {
    const exception = toApiException({
      type: 'error',
      code: 'ai_provider_unavailable',
      message: 'Try later',
      retryAfter: 3,
    })

    expect(exception).toBeInstanceOf(ApiHttpException)
    expect(exception.getStatus()).toBe(503)
    expect(exception.body).toEqual({
      code: 'ai_provider_unavailable',
      messages: ['Try later'],
      retryAfter: 3,
    })
  })
})
