import { type AiErrorCode, AiProviderError } from '@kb/ai'
import { describe, expect, it } from 'vitest'

describe('AiProviderError', () => {
  it('is an Error carrying a code, details and the cause', () => {
    const cause = new Error('socket hang up')
    const error = new AiProviderError('connection', 'Could not reach groq', {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      cause,
    })
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      name: 'AiProviderError',
      code: 'connection',
      message: 'Could not reach groq',
      details: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      cause,
    })
  })

  it.each([
    ['rate_limited', true],
    ['timeout', true],
    ['connection', true],
    ['server', true],
    ['authentication', false],
    ['permission', false],
    ['not_found', false],
    ['invalid_request', false],
    ['aborted', false],
    ['unsupported', false],
    ['unknown', false],
  ] satisfies [AiErrorCode, boolean][])('%s is retryable: %s', (code, retryable) => {
    expect(new AiProviderError(code, 'failed', { provider: 'openai' }).retryable).toBe(retryable)
  })
})
