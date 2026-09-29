import { OpenAI } from 'openai'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createOpenAiClient } from '../../../src/adapters/openai-compatible/create-openai-client.js'
import type { OpenAiLikeClient } from '../../../src/adapters/openai-compatible/openai-like-client.types.js'
import { resolveChatEndpoint } from '../../../src/providers/resolve-endpoint.js'
import { buildAiConfig, buildChatEndpoint } from '../../fixtures.js'

const OLLAMA_ENDPOINT = buildChatEndpoint({
  provider: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  apiKey: 'ollama',
  headers: { 'X-Title': 'kb' },
  timeoutMs: 1_234,
  maxRetries: 1,
})

function asSdkClient(client: OpenAiLikeClient): OpenAI {
  if (client instanceof OpenAI) return client
  throw new Error('Expected the OpenAI SDK client')
}

describe('createOpenAiClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('configures the SDK client from the endpoint, ignoring ambient OPENAI_* variables', () => {
    vi.stubEnv('OPENAI_BASE_URL', 'https://ambient.example.com/v1')
    vi.stubEnv('OPENAI_ORG_ID', 'org-ambient')
    vi.stubEnv('OPENAI_PROJECT_ID', 'proj-ambient')
    expect(asSdkClient(createOpenAiClient(OLLAMA_ENDPOINT))).toMatchObject({
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'ollama',
      timeout: 1_234,
      maxRetries: 1,
      organization: null,
      project: null,
    })
  })

  it('puts the endpoint headers and key on the wire, and no OpenAI org header', async () => {
    vi.stubEnv('OPENAI_ORG_ID', 'org-ambient')
    const client = asSdkClient(createOpenAiClient(OLLAMA_ENDPOINT))
    const { req, url } = await client.buildRequest({ method: 'post', path: '/chat/completions' })
    const headers = new Headers(req.headers)
    expect(url).toBe('http://localhost:11434/v1/chat/completions')
    expect(headers.get('authorization')).toBe('Bearer ollama')
    expect(headers.get('x-title')).toBe('kb')
    expect(headers.has('openai-organization')).toBe(false)
  })

  it('reaches Gemini under its OpenAI-compatible path with a Bearer key', async () => {
    const config = buildAiConfig({ provider: 'gemini', apiKey: 'gemini-key' })
    const client = asSdkClient(createOpenAiClient(resolveChatEndpoint(config)))
    const { req, url } = await client.buildRequest({ method: 'post', path: '/chat/completions' })
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions')
    expect(new Headers(req.headers).get('authorization')).toBe('Bearer gemini-key')
  })
})
