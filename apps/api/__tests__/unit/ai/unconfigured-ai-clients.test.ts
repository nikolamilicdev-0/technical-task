import { AiProviderError } from '@kb/ai'
import { describe, expect, it } from 'vitest'

import { createUnconfiguredAiClients } from '../../../src/ai/unconfigured-ai-clients.js'

const PROBLEM = 'AI is not configured: AI_CHAT_API_KEY: OpenAI requires an API key'
const { chat, embedding } = createUnconfiguredAiClients(PROBLEM)

async function failureOf(action: () => Promise<unknown>): Promise<AiProviderError> {
  const error = await action().then(
    () => undefined,
    (reason: unknown) => reason
  )
  if (error instanceof AiProviderError) return error
  throw new Error(`Expected an AiProviderError, got ${String(error)}`)
}

function expectUnsupported(error: AiProviderError): void {
  expect(error.code).toBe('unsupported')
  expect(error.message).toBe(PROBLEM)
  expect(error.retryable).toBe(false)
}

describe('createUnconfiguredAiClients', () => {
  it('reports placeholder names instead of a real provider and model', () => {
    expect([chat.provider, chat.model, embedding.provider, embedding.model]).toEqual([
      'unconfigured',
      'unconfigured',
      'unconfigured',
      'unconfigured',
    ])
  })

  it('fails every chat call with the configuration problem', async () => {
    const messages = [{ role: 'user' as const, content: 'Hi' }]

    expectUnsupported(await failureOf(() => chat.complete({ messages })))
    expectUnsupported(
      await failureOf(() => chat.stream({ messages })[Symbol.asyncIterator]().next())
    )
  })

  it('fails every embedding call with the configuration problem', async () => {
    expectUnsupported(await failureOf(() => embedding.embed({ texts: ['Hi'] })))
  })

  it('refuses to name a vector space, so no chunks are requeued or searched for it', () => {
    expect(() => embedding.signature).toThrow(PROBLEM)
  })
})
