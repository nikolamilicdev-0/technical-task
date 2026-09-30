import {
  type AiConfig,
  createAiClients,
  type CreateOpenAiClient,
  type ResolvedEndpoint,
} from '@kb/ai'
import { describe, expect, it } from 'vitest'

import { OpenAiCompatibleChatModel } from '../../../src/adapters/openai-compatible/openai-compatible-chat-model.js'
import { OpenAiCompatibleEmbeddingModel } from '../../../src/adapters/openai-compatible/openai-compatible-embedding-model.js'
import { PROVIDER_IDS } from '../../../src/providers/provider-ids.js'
import { PROVIDER_PROFILES } from '../../../src/providers/provider-profiles.js'
import { FakeOpenAiClient } from '../../fake-openai-client.js'
import { buildAiConfig, captureAiErrorSync, TEST_API_KEY } from '../../fixtures.js'

const LOCAL_URL = 'http://localhost:8000/v1'

function recordEndpoints(): {
  endpoints: ResolvedEndpoint[]
  createOpenAiClient: CreateOpenAiClient
} {
  const endpoints: ResolvedEndpoint[] = []
  const createOpenAiClient: CreateOpenAiClient = (endpoint) => {
    endpoints.push(endpoint)
    return new FakeOpenAiClient()
  }
  return { endpoints, createOpenAiClient }
}

describe('createAiClients', () => {
  it('builds OpenAI-compatible chat and embedding models from one config', () => {
    const { endpoints, createOpenAiClient } = recordEndpoints()
    const clients = createAiClients(buildAiConfig({}, { dimensions: 512 }), { createOpenAiClient })
    expect(clients.chat).toBeInstanceOf(OpenAiCompatibleChatModel)
    expect(clients.embedding).toBeInstanceOf(OpenAiCompatibleEmbeddingModel)
    expect(clients.chat).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini' })
    expect(clients.embedding).toMatchObject({
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 512,
      signature: 'text-embedding-3-small#512',
    })
    expect(endpoints.map(({ baseUrl, timeoutMs }) => ({ baseUrl, timeoutMs }))).toEqual([
      { baseUrl: 'https://api.openai.com/v1', timeoutMs: 60_000 },
      { baseUrl: 'https://api.openai.com/v1', timeoutMs: 30_000 },
    ])
  })

  it('configures chat and embeddings independently', () => {
    const { endpoints, createOpenAiClient } = recordEndpoints()
    const config = buildAiConfig(
      { provider: 'groq', apiKey: 'gsk-test' },
      { provider: 'openai', apiKey: TEST_API_KEY }
    )
    const { chat, embedding } = createAiClients(config, { createOpenAiClient })
    expect([chat.provider, embedding.provider]).toEqual(['groq', 'openai'])
    expect(endpoints.map(({ baseUrl, apiKey }) => ({ baseUrl, apiKey }))).toEqual([
      { baseUrl: 'https://api.groq.com/openai/v1', apiKey: 'gsk-test' },
      { baseUrl: 'https://api.openai.com/v1', apiKey: TEST_API_KEY },
    ])
  })

  it.each(PROVIDER_IDS.filter((id) => PROVIDER_PROFILES[id].supportsEmbeddings))(
    'serves %s through the OpenAI-compatible adapters',
    (provider) => {
      const config = buildAiConfig(
        { provider, baseUrl: LOCAL_URL, model: 'chat-model' },
        { model: 'embedding-model' }
      )
      const { chat, embedding } = createAiClients(config, recordEndpoints())
      expect(chat).toBeInstanceOf(OpenAiCompatibleChatModel)
      expect(embedding).toBeInstanceOf(OpenAiCompatibleEmbeddingModel)
      expect([chat.provider, embedding.provider]).toEqual([provider, provider])
    }
  )

  it('hands OpenRouter attribution headers and Ollama placeholder keys to the SDK client', () => {
    const { endpoints, createOpenAiClient } = recordEndpoints()
    const config = buildAiConfig(
      { provider: 'openrouter' },
      { provider: 'ollama' },
      { name: 'ai-knowledge-base', url: 'http://localhost:3000' }
    )
    createAiClients(config, { createOpenAiClient })
    expect(endpoints[0]?.headers).toEqual({
      'X-Title': 'ai-knowledge-base',
      'HTTP-Referer': 'http://localhost:3000',
    })
    expect(endpoints[1]).toMatchObject({ apiKey: 'ollama', headers: {} })
  })

  it('lets configured overrides reach the SDK client', () => {
    const { endpoints, createOpenAiClient } = recordEndpoints()
    const config = buildAiConfig({
      provider: 'ollama',
      baseUrl: 'http://gpu-box:11434/v1',
      headers: { 'X-Team': 'kb' },
      maxRetries: 0,
    })
    createAiClients(config, { createOpenAiClient })
    expect(endpoints[0]).toMatchObject({
      baseUrl: 'http://gpu-box:11434/v1',
      headers: { 'X-Team': 'kb' },
      maxRetries: 0,
    })
    expect(endpoints[1]).toMatchObject({ baseUrl: 'http://gpu-box:11434/v1' })
  })

  it('refuses an embedding provider that serves no embeddings before opening any client', () => {
    const { endpoints, createOpenAiClient } = recordEndpoints()
    const valid = buildAiConfig({ provider: 'groq' }, { provider: 'openai', apiKey: TEST_API_KEY })
    const config: AiConfig = { ...valid, embedding: { ...valid.embedding, provider: 'groq' } }
    const error = captureAiErrorSync(() => createAiClients(config, { createOpenAiClient }))
    expect(error).toMatchObject({ code: 'unsupported', details: { provider: 'groq' } })
    expect(endpoints).toEqual([])
  })

  it('opens real SDK clients by default without touching the network', () => {
    const { chat, embedding } = createAiClients(buildAiConfig({ provider: 'ollama' }))
    expect(chat).toBeInstanceOf(OpenAiCompatibleChatModel)
    expect(embedding.signature).toBe('nomic-embed-text')
  })

  it('signs Gemini vectors with the 1536 dimensions its profile requests by default', () => {
    const { embedding } = createAiClients(buildAiConfig({ provider: 'gemini' }), recordEndpoints())
    expect(embedding).toMatchObject({ dimensions: 1536, signature: 'gemini-embedding-001#1536' })
  })
})
