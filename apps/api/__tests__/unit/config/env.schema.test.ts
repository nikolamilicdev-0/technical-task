import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

import { describe, expect, it } from 'vitest'

import { apiEnvShape, envSchema } from '../../../src/config/env.schema.js'
import { TEST_ENV } from '../../fixtures.js'

const ENV_EXAMPLE = parseEnv(
  readFileSync(new URL('../../../../../.env.example', import.meta.url), 'utf8')
)
// Read by the web app or the db:* scripts only.
const NOT_READ_BY_API = ['NEXT_PUBLIC_API_URL', 'SUPABASE_DB_URL', 'SUPABASE_PROJECT_REF']
const API_KEYS = Object.keys(apiEnvShape)

function issuePaths(env: Record<string, string | undefined>): string[] {
  const result = envSchema.safeParse(env)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

function pick(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, record[key]]))
}

describe('envSchema', () => {
  it('declares exactly the non-AI variables of .env.example that the API reads', () => {
    const documented = Object.keys(ENV_EXAMPLE).filter(
      (name) => !name.startsWith('AI_') && !NOT_READ_BY_API.includes(name)
    )
    expect(API_KEYS.sort()).toEqual(documented.sort())
  })

  it('uses the values .env.example documents as its defaults', () => {
    const fromExample = envSchema.parse({ ...ENV_EXAMPLE, ...TEST_ENV })
    const fromDefaults = envSchema.parse(TEST_ENV)
    expect(pick(fromExample, API_KEYS)).toEqual(pick(fromDefaults, API_KEYS))
  })

  it('fills every optional variable with its default', () => {
    expect(envSchema.parse(TEST_ENV)).toMatchObject({
      API_PORT: 4000,
      WEB_ORIGIN: 'http://localhost:3000',
      LOG_LEVEL: 'log',
      RAG_RETRIEVAL_MODE: 'hybrid',
      RAG_QUERY_REWRITE: true,
      RAG_TOP_N: 6,
      RAG_MIN_SIMILARITY: 0,
      INGESTION_WORKER_ENABLED: true,
      RATE_LIMIT_DEFAULT_PER_MINUTE: 120,
      RATE_LIMIT_CHAT_PER_MINUTE: 20,
    })
  })

  it('treats blank values as unset', () => {
    const env = envSchema.parse({ ...TEST_ENV, API_PORT: '', LOG_LEVEL: '   ', RAG_TOP_N: '' })
    expect(env).toMatchObject({ API_PORT: 4000, LOG_LEVEL: 'log', RAG_TOP_N: 6 })
  })

  it('decodes numbers and flags and trims the raw text', () => {
    const env = envSchema.parse({
      ...TEST_ENV,
      API_PORT: ' 4100 ',
      RAG_QUERY_REWRITE: 'false',
      INGESTION_WORKER_ENABLED: 'off',
      RAG_MIN_SIMILARITY: '0.25',
    })
    expect(env).toMatchObject({
      API_PORT: 4100,
      RAG_QUERY_REWRITE: false,
      INGESTION_WORKER_ENABLED: false,
      RAG_MIN_SIMILARITY: 0.25,
    })
  })

  it('reduces WEB_ORIGIN to an origin, because CORS compares origins exactly', () => {
    const env = envSchema.parse({ ...TEST_ENV, WEB_ORIGIN: 'https://kb.example.com/app/' })
    expect(env.WEB_ORIGIN).toBe('https://kb.example.com')
  })

  it('names every missing Supabase variable', () => {
    expect(issuePaths({}).sort()).toEqual([
      'SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SECRET_KEY',
      'SUPABASE_URL',
    ])
    expect(issuePaths({ ...TEST_ENV, SUPABASE_SECRET_KEY: '  ' })).toEqual(['SUPABASE_SECRET_KEY'])
  })

  it.each([
    ['a port that is not a number', { API_PORT: 'http' }, 'API_PORT'],
    ['a port out of range', { API_PORT: '70000' }, 'API_PORT'],
    ['an unknown log level', { LOG_LEVEL: 'loud' }, 'LOG_LEVEL'],
    ['a Supabase URL without a scheme', { SUPABASE_URL: 'localhost:54321' }, 'SUPABASE_URL'],
    ['an unknown retrieval mode', { RAG_RETRIEVAL_MODE: 'keyword' }, 'RAG_RETRIEVAL_MODE'],
    ['a similarity outside the cosine range', { RAG_MIN_SIMILARITY: '2' }, 'RAG_MIN_SIMILARITY'],
    ['a fractional batch size', { INGESTION_BATCH_SIZE: '2.5' }, 'INGESTION_BATCH_SIZE'],
    [
      'a flag that is not boolean',
      { INGESTION_WORKER_ENABLED: 'sometimes' },
      'INGESTION_WORKER_ENABLED',
    ],
    ['a malformed AI variable', { AI_CHAT_TIMEOUT_MS: 'soon' }, 'AI_CHAT_TIMEOUT_MS'],
  ])('rejects %s, naming the variable', (_, overrides, name) => {
    expect(issuePaths({ ...TEST_ENV, ...overrides })).toEqual([name])
  })
})
