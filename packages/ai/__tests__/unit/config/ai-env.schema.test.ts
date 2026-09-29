import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

import { type AiConfig, aiConfigFromEnv, aiEnvSchema } from '@kb/ai'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const ENV_EXAMPLE = parseEnv(
  readFileSync(new URL('../../../../../.env.example', import.meta.url), 'utf8')
)
const OPENAI_KEY = 'sk-test'
const GEMINI_KEY = 'gemini-test-key'
const LOCAL_SERVER_URL = 'http://localhost:1234/v1'

function fromEnv(env: Record<string, string | undefined>): AiConfig {
  return aiConfigFromEnv(aiEnvSchema.parse(env))
}

function issuesOf(action: () => unknown): { path: string; message: string }[] {
  try {
    action()
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error
    return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
  }
  return []
}

describe('aiEnvSchema', () => {
  it('declares exactly the AI_* variables documented in .env.example', () => {
    const documented = Object.keys(ENV_EXAMPLE).filter((name) => name.startsWith('AI_'))
    expect(Object.keys(aiEnvSchema.shape).sort()).toEqual(documented.sort())
  })

  it('treats blank and whitespace-only values as unset', () => {
    const env = { AI_CHAT_MODEL: '', AI_CHAT_TIMEOUT_MS: '   ', AI_CHAT_STREAM_USAGE: '' }
    expect(aiEnvSchema.parse(env)).toEqual({})
  })

  it('decodes numbers, booleans and JSON headers, trimming the raw text', () => {
    const env = {
      AI_CHAT_MODEL: '  llama3.2  ',
      AI_CHAT_TIMEOUT_MS: '45000',
      AI_CHAT_TEMPERATURE: '0.2',
      AI_CHAT_STREAM_USAGE: 'false',
      AI_CHAT_HEADERS_JSON: '{"X-Team":"kb"}',
      AI_EMBEDDING_DIMENSIONS: ' 768 ',
    }
    expect(aiEnvSchema.parse(env)).toEqual({
      AI_CHAT_MODEL: 'llama3.2',
      AI_CHAT_TIMEOUT_MS: 45_000,
      AI_CHAT_TEMPERATURE: 0.2,
      AI_CHAT_STREAM_USAGE: false,
      AI_CHAT_HEADERS_JSON: { 'X-Team': 'kb' },
      AI_EMBEDDING_DIMENSIONS: 768,
    })
  })

  it.each([
    ['true', true],
    ['YES', true],
    ['1', true],
    ['off', false],
    ['0', false],
  ])('reads the stream-usage flag %s as %s', (value, expected) => {
    expect(aiEnvSchema.parse({ AI_CHAT_STREAM_USAGE: value }).AI_CHAT_STREAM_USAGE).toBe(expected)
  })

  it.each([
    ['an unknown provider', { AI_CHAT_PROVIDER: 'anthropic' }, 'AI_CHAT_PROVIDER'],
    ['a non-numeric timeout', { AI_CHAT_TIMEOUT_MS: 'soon' }, 'AI_CHAT_TIMEOUT_MS'],
    ['a non-boolean flag', { AI_CHAT_STREAM_USAGE: 'sometimes' }, 'AI_CHAT_STREAM_USAGE'],
    ['headers that are not JSON', { AI_CHAT_HEADERS_JSON: 'X-Team: kb' }, 'AI_CHAT_HEADERS_JSON'],
    [
      'headers given as an array',
      { AI_EMBEDDING_HEADERS_JSON: '["X"]' },
      'AI_EMBEDDING_HEADERS_JSON',
    ],
    [
      'a header with a non-string value',
      { AI_CHAT_HEADERS_JSON: '{"X-Retries":3}' },
      'AI_CHAT_HEADERS_JSON.X-Retries',
    ],
  ])('rejects %s', (_, env, path) => {
    expect(issuesOf(() => aiEnvSchema.parse(env)).map((issue) => issue.path)).toContain(path)
  })
})

describe('aiConfigFromEnv', () => {
  it('turns the committed .env.example into the OpenAI setup once a key is added', () => {
    expect(fromEnv({ ...ENV_EXAMPLE, AI_CHAT_API_KEY: OPENAI_KEY })).toEqual({
      chat: {
        provider: 'openai',
        apiKey: OPENAI_KEY,
        model: 'gpt-4o-mini',
        timeoutMs: 60_000,
        maxRetries: 2,
      },
      embedding: {
        provider: 'openai',
        apiKey: OPENAI_KEY,
        model: 'text-embedding-3-small',
        timeoutMs: 30_000,
        maxRetries: 2,
        batchSize: 32,
      },
      app: { name: 'ai-knowledge-base', url: 'http://localhost:3000' },
    })
  })

  it('fills every default when only the chat key is set', () => {
    expect(fromEnv({ AI_CHAT_API_KEY: OPENAI_KEY })).toEqual({
      chat: { provider: 'openai', apiKey: OPENAI_KEY, timeoutMs: 60_000, maxRetries: 2 },
      embedding: {
        provider: 'openai',
        apiKey: OPENAI_KEY,
        timeoutMs: 30_000,
        maxRetries: 2,
        batchSize: 32,
      },
      app: {},
    })
  })

  it('runs Ollama without any API key', () => {
    const config = fromEnv({ AI_CHAT_PROVIDER: 'ollama' })
    expect(config.embedding.provider).toBe('ollama')
    expect(config.chat.apiKey).toBeUndefined()
    expect(config.embedding.apiKey).toBeUndefined()
  })

  it('accepts the documented Groq chat + OpenAI embeddings example', () => {
    const config = fromEnv({
      AI_CHAT_PROVIDER: 'groq',
      AI_CHAT_API_KEY: 'gsk-test',
      AI_CHAT_MODEL: 'llama-3.3-70b-versatile',
      AI_EMBEDDING_PROVIDER: 'openai',
      AI_EMBEDDING_API_KEY: OPENAI_KEY,
    })
    expect(config.chat).toMatchObject({ provider: 'groq', apiKey: 'gsk-test' })
    expect(config.embedding).toMatchObject({ provider: 'openai', apiKey: OPENAI_KEY })
  })

  it('accepts the documented fully local example', () => {
    const config = fromEnv({
      AI_CHAT_PROVIDER: 'ollama',
      AI_CHAT_MODEL: 'llama3.2',
      AI_EMBEDDING_PROVIDER: 'ollama',
      AI_EMBEDDING_MODEL: 'nomic-embed-text',
    })
    expect(config.chat.model).toBe('llama3.2')
    expect(config.embedding.model).toBe('nomic-embed-text')
  })

  it('accepts the documented Google Gemini example, sharing the chat key with embeddings', () => {
    const config = fromEnv({
      AI_CHAT_PROVIDER: 'gemini',
      AI_CHAT_API_KEY: GEMINI_KEY,
      AI_EMBEDDING_DIMENSIONS: '1536',
    })
    expect(config.chat).toMatchObject({ provider: 'gemini', apiKey: GEMINI_KEY })
    expect(config.embedding).toMatchObject({
      provider: 'gemini',
      apiKey: GEMINI_KEY,
      dimensions: 1536,
    })
  })

  describe('embedding settings inherited from chat', () => {
    const customChat = {
      AI_CHAT_PROVIDER: 'custom',
      AI_CHAT_API_KEY: 'lm-studio',
      AI_CHAT_MODEL: 'qwen2.5-7b-instruct',
      AI_CHAT_BASE_URL: LOCAL_SERVER_URL,
      AI_CHAT_HEADERS_JSON: '{"X-Team":"kb"}',
      AI_EMBEDDING_MODEL: 'nomic-embed-text',
    }

    it('reuses the chat key, base URL and headers when the provider matches', () => {
      expect(fromEnv(customChat).embedding).toMatchObject({
        provider: 'custom',
        apiKey: 'lm-studio',
        baseUrl: LOCAL_SERVER_URL,
        headers: { 'X-Team': 'kb' },
      })
    })

    it('treats an explicitly repeated provider as a match', () => {
      const env = { AI_CHAT_API_KEY: OPENAI_KEY, AI_EMBEDDING_PROVIDER: 'openai' }
      expect(fromEnv(env).embedding.apiKey).toBe(OPENAI_KEY)
    })

    it('keeps explicit embedding values', () => {
      const env = {
        ...customChat,
        AI_EMBEDDING_API_KEY: 'embed-key',
        AI_EMBEDDING_BASE_URL: 'http://localhost:9000/v1',
        AI_EMBEDDING_HEADERS_JSON: '{}',
      }
      expect(fromEnv(env).embedding).toMatchObject({
        apiKey: 'embed-key',
        baseUrl: 'http://localhost:9000/v1',
        headers: {},
      })
    })

    it('inherits nothing across different providers', () => {
      const env = {
        AI_CHAT_PROVIDER: 'groq',
        AI_CHAT_API_KEY: 'gsk-test',
        AI_EMBEDDING_PROVIDER: 'openai',
      }
      expect(issuesOf(() => fromEnv(env))).toEqual([
        { path: 'AI_EMBEDDING_API_KEY', message: 'OpenAI requires an API key' },
      ])
    })
  })

  it.each([
    [
      'a custom chat server without a base URL',
      { AI_CHAT_PROVIDER: 'custom', AI_CHAT_MODEL: 'qwen', AI_EMBEDDING_PROVIDER: 'ollama' },
      'AI_CHAT_BASE_URL',
      'Custom OpenAI-compatible server needs a base URL',
    ],
    [
      'a custom chat server without a model',
      {
        AI_CHAT_PROVIDER: 'custom',
        AI_CHAT_BASE_URL: LOCAL_SERVER_URL,
        AI_EMBEDDING_PROVIDER: 'ollama',
      },
      'AI_CHAT_MODEL',
      'Custom OpenAI-compatible server has no default chat model; name one',
    ],
    [
      'a hosted provider without a key',
      { AI_CHAT_PROVIDER: 'together' },
      'AI_CHAT_API_KEY',
      'Together AI requires an API key',
    ],
    [
      'Gemini without a key',
      { AI_CHAT_PROVIDER: 'gemini' },
      'AI_CHAT_API_KEY',
      'Google Gemini requires an API key',
    ],
    [
      'Groq embeddings inherited from the chat provider',
      { AI_CHAT_PROVIDER: 'groq', AI_CHAT_API_KEY: 'gsk-test' },
      'AI_EMBEDDING_PROVIDER',
      'Groq does not serve embeddings; use one of: openai, together, openrouter, gemini, ollama, custom',
    ],
  ])('reports %s under the variable name', (_, env, path, message) => {
    expect(issuesOf(() => fromEnv(env))).toEqual([{ path, message }])
  })

  it.each([
    ['a base URL without a scheme', { AI_CHAT_BASE_URL: 'localhost:11434/v1' }, 'AI_CHAT_BASE_URL'],
    [
      'a non-http base URL',
      { AI_EMBEDDING_BASE_URL: 'ftp://files.local/v1' },
      'AI_EMBEDDING_BASE_URL',
    ],
    ['a negative timeout', { AI_CHAT_TIMEOUT_MS: '-5' }, 'AI_CHAT_TIMEOUT_MS'],
    ['fractional retries', { AI_EMBEDDING_MAX_RETRIES: '1.5' }, 'AI_EMBEDDING_MAX_RETRIES'],
    ['a temperature above 2', { AI_CHAT_TEMPERATURE: '2.5' }, 'AI_CHAT_TEMPERATURE'],
    ['fractional dimensions', { AI_EMBEDDING_DIMENSIONS: '76.8' }, 'AI_EMBEDDING_DIMENSIONS'],
    ['a zero batch size', { AI_EMBEDDING_BATCH_SIZE: '0' }, 'AI_EMBEDDING_BATCH_SIZE'],
    ['an app URL without a scheme', { AI_APP_URL: 'example.com' }, 'AI_APP_URL'],
  ])('rejects %s', (_, env, path) => {
    const paths = issuesOf(() => fromEnv({ AI_CHAT_API_KEY: OPENAI_KEY, ...env }))
    expect(paths.map((issue) => issue.path)).toEqual([path])
  })

  it('throws a ZodError so callers can format it like their other env errors', () => {
    expect(() => fromEnv({ AI_CHAT_PROVIDER: 'together' })).toThrow(z.ZodError)
  })
})
