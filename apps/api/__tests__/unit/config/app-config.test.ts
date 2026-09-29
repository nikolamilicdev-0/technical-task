import { describe, expect, it } from 'vitest'

import { loadAppConfig } from '../../../src/config/app-config.js'
import { buildTestConfig, TEST_ENV, TEST_OPENAI_KEY } from '../../fixtures.js'

describe('loadAppConfig', () => {
  it('builds typed sections from the environment', () => {
    const config = buildTestConfig({ API_PORT: '4100', RATE_LIMIT_CHAT_PER_MINUTE: '5' })

    expect(config.app).toEqual({
      port: 4100,
      webOrigin: 'http://localhost:3000',
      logLevels: ['fatal', 'error', 'warn', 'log'],
    })
    expect(config.supabase).toEqual({
      url: TEST_ENV.SUPABASE_URL,
      publishableKey: TEST_ENV.SUPABASE_PUBLISHABLE_KEY,
      secretKey: TEST_ENV.SUPABASE_SECRET_KEY,
    })
    expect(config.rag).toEqual({
      retrievalMode: 'hybrid',
      queryRewrite: true,
      vectorK: 20,
      keywordK: 20,
      topN: 6,
      minSimilarity: 0,
      rrfK: 60,
      contextTokenBudget: 3000,
      historyTokenBudget: 2000,
      maxAnswerTokens: 1024,
    })
    expect(config.ingestion).toEqual({
      workerEnabled: true,
      sweepIntervalMs: 30_000,
      batchSize: 5,
      staleAfterMinutes: 10,
      maxAttempts: 5,
    })
    expect(config.rateLimit).toEqual({ defaultPerMinute: 120, chatPerMinute: 5 })
  })

  it.each([
    ['error', ['fatal', 'error']],
    ['warn', ['fatal', 'error', 'warn']],
    ['verbose', ['fatal', 'error', 'warn', 'log', 'debug', 'verbose']],
  ])('enables LOG_LEVEL=%s and every less verbose level', (level, expected) => {
    expect(buildTestConfig({ LOG_LEVEL: level }).app.logLevels).toEqual(expected)
  })

  describe('AI setup', () => {
    it('is unconfigured without an API key, naming the variable to set', () => {
      const { ai } = buildTestConfig()

      expect(ai.configured).toBe(false)
      if (ai.configured) return
      expect(ai.problem).toMatch(/^AI is not configured: AI_CHAT_API_KEY: /)
    })

    it('is unconfigured when the variables contradict each other', () => {
      const { ai } = buildTestConfig({ AI_CHAT_PROVIDER: 'groq', AI_CHAT_API_KEY: 'gsk-test' })

      expect(ai.configured).toBe(false)
      if (ai.configured) return
      expect(ai.problem).toContain('AI_EMBEDDING_PROVIDER')
    })

    it('carries the validated AI config once a key is set', () => {
      const { ai } = buildTestConfig({ AI_CHAT_API_KEY: TEST_OPENAI_KEY })

      expect(ai.configured).toBe(true)
      if (!ai.configured) return
      expect(ai.config.chat).toMatchObject({ provider: 'openai', apiKey: TEST_OPENAI_KEY })
      expect(ai.config.embedding).toMatchObject({ provider: 'openai', apiKey: TEST_OPENAI_KEY })
    })
  })

  it('throws one error that lists every invalid variable and points at .env.example', () => {
    expect(() => loadAppConfig({ API_PORT: 'http' })).toThrow(/\.env\.example/)
    expect(() => loadAppConfig({ API_PORT: 'http' })).toThrow(
      /API_PORT[\s\S]*SUPABASE_URL[\s\S]*SUPABASE_PUBLISHABLE_KEY[\s\S]*SUPABASE_SECRET_KEY/
    )
  })
})
