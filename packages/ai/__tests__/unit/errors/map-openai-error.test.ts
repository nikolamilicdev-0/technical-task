import { type AiErrorCode, AiProviderError } from '@kb/ai'
import { APIConnectionError, APIConnectionTimeoutError, APIError, APIUserAbortError } from 'openai'
import { describe, expect, it } from 'vitest'

import type { ProviderCallContext } from '../../../src/errors/ai-provider-error.types.js'
import { mapOpenAiError } from '../../../src/errors/map-openai-error.js'

const CHAT: ProviderCallContext = { kind: 'chat', provider: 'openai', model: 'gpt-4o-mini' }
const EMBEDDING: ProviderCallContext = {
  kind: 'embedding',
  provider: 'ollama',
  model: 'nomic-embed-text',
}
const NOW = Date.parse('2026-09-29T10:00:00Z')
const SECOND_MS = 1_000

function statusError(
  status: number,
  headers: Record<string, string> = {},
  error: object = { message: 'Provider says no' }
): APIError {
  return APIError.generate(status, { error }, undefined, new Headers(headers))
}

describe('mapOpenAiError', () => {
  it.each([
    [400, 'invalid_request'],
    [401, 'authentication'],
    [402, 'permission'],
    [403, 'permission'],
    [404, 'not_found'],
    [408, 'timeout'],
    [409, 'invalid_request'],
    [413, 'invalid_request'],
    [422, 'invalid_request'],
    [429, 'rate_limited'],
    [500, 'server'],
    [502, 'server'],
    [503, 'server'],
  ] satisfies [number, AiErrorCode][])('maps HTTP %i to %s', (status, code) => {
    expect(mapOpenAiError(statusError(status), CHAT, NOW).code).toBe(code)
  })

  it('treats an exhausted quota as a permission problem, not a retryable rate limit', () => {
    const quota = statusError(429, {}, { code: 'insufficient_quota', message: 'Quota exceeded' })
    const error = mapOpenAiError(quota, CHAT, NOW)
    expect(error.code).toBe('permission')
    expect(error.retryable).toBe(false)
  })

  it.each([
    ['the SDK abort error', new APIUserAbortError(), 'aborted'],
    ['a DOM abort error', new DOMException('The operation was aborted.', 'AbortError'), 'aborted'],
    ['a connection timeout', new APIConnectionTimeoutError(), 'timeout'],
    ['a connection failure', new APIConnectionError({ message: 'fetch failed' }), 'connection'],
    [
      'an error frame inside a stream',
      new APIError(undefined, { message: 'Overloaded' }, undefined, new Headers()),
      'server',
    ],
    ['a plain error', new TypeError('terminated'), 'unknown'],
    ['a thrown string', 'boom', 'unknown'],
  ] satisfies [string, unknown, AiErrorCode][])('maps %s to %s', (_, error, code) => {
    expect(mapOpenAiError(error, CHAT, NOW).code).toBe(code)
  })

  it('returns an AiProviderError unchanged', () => {
    const original = new AiProviderError('unsupported', 'No embeddings', { provider: 'groq' })
    expect(mapOpenAiError(original, CHAT, NOW)).toBe(original)
  })

  it('keeps the provider, model, status and original error', () => {
    const cause = statusError(404)
    const error = mapOpenAiError(cause, CHAT, NOW)
    expect(error).toBeInstanceOf(AiProviderError)
    expect(error.details).toEqual({ provider: 'openai', model: 'gpt-4o-mini', status: 404, cause })
    expect(error.cause).toBe(cause)
  })

  it('ends the message with the provider explanation', () => {
    expect(mapOpenAiError(statusError(400), CHAT, NOW).message).toBe(
      'openai rejected the request for "gpt-4o-mini" (400 Provider says no)'
    )
  })

  it.each([
    [statusError(401), CHAT, 'AI_CHAT_API_KEY'],
    [statusError(404), CHAT, 'AI_CHAT_MODEL'],
    [statusError(404), EMBEDDING, 'AI_EMBEDDING_MODEL'],
    [new APIConnectionTimeoutError(), EMBEDDING, 'AI_EMBEDDING_TIMEOUT_MS'],
    [new APIConnectionError({}), EMBEDDING, 'AI_EMBEDDING_BASE_URL'],
  ] satisfies [unknown, ProviderCallContext, string][])(
    'names the variable to check (%#)',
    (error, context, variable) => {
      expect(mapOpenAiError(error, context, NOW).message).toContain(variable)
    }
  )

  it('describes an abort without the SDK wording', () => {
    expect(mapOpenAiError(new APIUserAbortError(), EMBEDDING, NOW)).toMatchObject({
      code: 'aborted',
      message: 'The embedding request to ollama was aborted by the caller',
    })
  })

  it.each([
    ['whole seconds', { 'retry-after': '7' }, 7],
    ['fractional seconds, rounded up', { 'retry-after': '1.2' }, 2],
    ['zero, raised to one second', { 'retry-after': '0' }, 1],
    ['an HTTP date', { 'retry-after': new Date(NOW + 30 * SECOND_MS).toUTCString() }, 30],
    ['an HTTP date in the past', { 'retry-after': new Date(NOW - 5 * SECOND_MS).toUTCString() }, 1],
    ['milliseconds, preferred over seconds', { 'retry-after-ms': '1500', 'retry-after': '60' }, 2],
  ])('reads Retry-After given as %s', (_, headers, seconds) => {
    const error = mapOpenAiError(statusError(429, headers), CHAT, NOW)
    expect(error.details.retryAfterSeconds).toBe(seconds)
  })

  it.each([
    ['absent', {}],
    ['unparseable', { 'retry-after': 'soon' }],
    ['negative', { 'retry-after': '-3' }],
  ])('leaves the retry hint unset when Retry-After is %s', (_, headers) => {
    expect(mapOpenAiError(statusError(429, headers), CHAT, NOW).details.retryAfterSeconds).toBe(
      undefined
    )
  })
})
