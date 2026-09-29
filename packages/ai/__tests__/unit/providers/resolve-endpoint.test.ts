import { type AiConfig, aiConfigFromEnv, aiEnvSchema } from '@kb/ai'
import { describe, expect, it } from 'vitest'

import { PROVIDER_IDS } from '../../../src/providers/provider-ids.js'
import { PROVIDER_PROFILES } from '../../../src/providers/provider-profiles.js'
import {
  resolveChatEndpoint,
  resolveEmbeddingEndpoint,
} from '../../../src/providers/resolve-endpoint.js'
import { buildAiConfig, captureAiErrorSync, TEST_API_KEY } from '../../fixtures.js'

const OPENAI_EMBEDDINGS = { provider: 'openai', apiKey: TEST_API_KEY } as const
const APP = { name: 'ai-knowledge-base', url: 'http://localhost:3000' }
const GEMINI_KEY = 'gemini-test-key'
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'

describe('resolveChatEndpoint', () => {
  it.each(PROVIDER_IDS.filter((id) => id !== 'custom'))('applies the %s defaults', (provider) => {
    const profile = PROVIDER_PROFILES[provider]
    const endpoint = resolveChatEndpoint(buildAiConfig({ provider }, OPENAI_EMBEDDINGS))
    expect(endpoint).toMatchObject({
      provider,
      baseUrl: profile.defaultBaseUrl,
      model: profile.defaultChatModel,
      maxTokensParam: profile.maxTokensParam,
      streamUsage: true,
    })
  })

  it('lets every configured value win over the profile', () => {
    const chat = {
      provider: 'groq',
      baseUrl: 'https://gateway.example.com/v1',
      model: 'llama-3.1-8b-instant',
      streamUsage: false,
      temperature: 0.3,
      timeoutMs: 5_000,
      maxRetries: 0,
      headers: { 'X-Team': 'kb' },
    } as const
    expect(resolveChatEndpoint(buildAiConfig(chat, OPENAI_EMBEDDINGS))).toEqual({
      provider: 'groq',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: TEST_API_KEY,
      headers: { 'X-Team': 'kb' },
      model: 'llama-3.1-8b-instant',
      timeoutMs: 5_000,
      maxRetries: 0,
      streamUsage: false,
      maxTokensParam: 'max_tokens',
      temperature: 0.3,
    })
  })

  it('sends OpenRouter the app attribution headers', () => {
    const config = buildAiConfig({ provider: 'openrouter' }, {}, APP)
    expect(resolveChatEndpoint(config).headers).toEqual({
      'X-Title': 'ai-knowledge-base',
      'HTTP-Referer': 'http://localhost:3000',
    })
  })

  it('omits the attribution headers the app does not set', () => {
    const config = buildAiConfig({ provider: 'openrouter' }, {}, { name: 'kb' })
    expect(resolveChatEndpoint(config).headers).toEqual({ 'X-Title': 'kb' })
  })

  it('lets explicit headers override attribution headers', () => {
    const config = buildAiConfig(
      { provider: 'openrouter', headers: { 'X-Title': 'Mine' } },
      {},
      APP
    )
    expect(resolveChatEndpoint(config).headers).toEqual({
      'X-Title': 'Mine',
      'HTTP-Referer': 'http://localhost:3000',
    })
  })

  it('keeps attribution headers away from other providers', () => {
    expect(resolveChatEndpoint(buildAiConfig({}, {}, APP)).headers).toEqual({})
  })

  it('sends a placeholder key to keyless providers unless a key is configured', () => {
    const { apiKey, ...ollama } = { provider: 'ollama', apiKey: undefined } as const
    expect(resolveChatEndpoint(buildAiConfig({ ...ollama, apiKey })).apiKey).toBe('ollama')
    expect(resolveChatEndpoint(buildAiConfig({ ...ollama, apiKey: 'proxy-key' })).apiKey).toBe(
      'proxy-key'
    )
  })

  it('points Gemini at its OpenAI-compatible endpoint with the configured key', () => {
    const config = buildAiConfig({ provider: 'gemini', apiKey: GEMINI_KEY })
    expect(resolveChatEndpoint(config)).toEqual({
      provider: 'gemini',
      baseUrl: GEMINI_BASE_URL,
      apiKey: GEMINI_KEY,
      headers: {},
      model: 'gemini-3.5-flash-lite',
      timeoutMs: 60_000,
      maxRetries: 2,
      streamUsage: true,
      maxTokensParam: 'max_completion_tokens',
    })
  })
})

describe('resolveEmbeddingEndpoint', () => {
  it('passes the configured dimensions and whether the provider accepts them', () => {
    const openai = resolveEmbeddingEndpoint(buildAiConfig({}, { dimensions: 512 }))
    const ollama = resolveEmbeddingEndpoint(
      buildAiConfig({}, { provider: 'ollama', dimensions: 768 })
    )
    expect(openai).toMatchObject({ dimensions: 512, supportsEmbeddingDimensions: true })
    expect(ollama).toMatchObject({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'ollama',
      dimensions: 768,
      supportsEmbeddingDimensions: false,
    })
  })

  it('sizes Gemini embeddings to its profile default, reusing the chat key', () => {
    const config = buildAiConfig({ provider: 'gemini', apiKey: GEMINI_KEY })
    expect(resolveEmbeddingEndpoint(config)).toMatchObject({
      provider: 'gemini',
      baseUrl: GEMINI_BASE_URL,
      apiKey: GEMINI_KEY,
      model: 'gemini-embedding-001',
      dimensions: 1536,
      supportsEmbeddingDimensions: true,
    })
  })

  it.each([
    ['Gemini defaults to its profile size', { AI_CHAT_PROVIDER: 'gemini' }, 1536],
    [
      'AI_EMBEDDING_DIMENSIONS wins over the profile size',
      { AI_CHAT_PROVIDER: 'gemini', AI_EMBEDDING_DIMENSIONS: '768' },
      768,
    ],
    ['OpenAI has no profile size, so the native one stays', {}, undefined],
  ])('resolves the embedding size from the environment: %s', (_, env, dimensions) => {
    const config = aiConfigFromEnv(aiEnvSchema.parse({ AI_CHAT_API_KEY: TEST_API_KEY, ...env }))
    expect(resolveEmbeddingEndpoint(config).dimensions).toBe(dimensions)
  })

  it('rejects a provider that serves no embeddings as unsupported', () => {
    const valid = buildAiConfig({ provider: 'groq' }, OPENAI_EMBEDDINGS)
    const config: AiConfig = { ...valid, embedding: { ...valid.embedding, provider: 'groq' } }
    expect(captureAiErrorSync(() => resolveEmbeddingEndpoint(config))).toMatchObject({
      code: 'unsupported',
      message: 'Groq does not serve embeddings',
      details: { provider: 'groq' },
    })
  })

  it.each([
    ['a base URL', { provider: 'custom', model: 'nomic-embed-text' }, 'needs a base URL'],
    ['an API key', { provider: 'together', apiKey: undefined }, 'requires an API key'],
    ['a model', { provider: 'custom', baseUrl: 'http://localhost:1234/v1' }, 'no default model'],
  ] as const)('guards hand-built configs that lack %s', (_, gap, message) => {
    const valid = buildAiConfig()
    const config: AiConfig = { ...valid, embedding: { ...valid.embedding, ...gap } }
    const error = captureAiErrorSync(() => resolveEmbeddingEndpoint(config))
    expect(error.code).toBe('unsupported')
    expect(error.message).toContain(message)
  })
})
