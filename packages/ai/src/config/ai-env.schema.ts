import { z } from 'zod'

import {
  type AiConfig,
  type AiConfigInput,
  aiConfigSchema,
  headersSchema,
  providerIdSchema,
} from './ai-config.schema.js'

const headersJsonSchema = z
  .string()
  .transform((json, ctx): unknown => {
    try {
      return JSON.parse(json)
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Expected valid JSON' })
      return z.NEVER
    }
  })
  .pipe(headersSchema)

function normalizeEnvValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function optionalEnv<TSchema extends z.ZodType>(schema: TSchema) {
  return z.preprocess(normalizeEnvValue, schema.optional())
}

const optionalProvider = optionalEnv(providerIdSchema)
const optionalText = optionalEnv(z.string())
const optionalNumber = optionalEnv(z.coerce.number())
const optionalFlag = optionalEnv(z.stringbool())
const optionalHeaders = optionalEnv(headersJsonSchema)

export const aiEnvSchema = z.object({
  AI_CHAT_PROVIDER: optionalProvider,
  AI_CHAT_API_KEY: optionalText,
  AI_CHAT_MODEL: optionalText,
  AI_CHAT_BASE_URL: optionalText,
  AI_CHAT_TIMEOUT_MS: optionalNumber,
  AI_CHAT_MAX_RETRIES: optionalNumber,
  AI_CHAT_STREAM_USAGE: optionalFlag,
  AI_CHAT_TEMPERATURE: optionalNumber,
  AI_CHAT_HEADERS_JSON: optionalHeaders,
  AI_EMBEDDING_PROVIDER: optionalProvider,
  AI_EMBEDDING_API_KEY: optionalText,
  AI_EMBEDDING_MODEL: optionalText,
  AI_EMBEDDING_BASE_URL: optionalText,
  AI_EMBEDDING_DIMENSIONS: optionalNumber,
  AI_EMBEDDING_BATCH_SIZE: optionalNumber,
  AI_EMBEDDING_TIMEOUT_MS: optionalNumber,
  AI_EMBEDDING_MAX_RETRIES: optionalNumber,
  AI_EMBEDDING_HEADERS_JSON: optionalHeaders,
  AI_APP_NAME: optionalText,
  AI_APP_URL: optionalText,
})
export type AiEnv = z.output<typeof aiEnvSchema>

export const AI_ENV_NAMES = {
  chat: {
    provider: 'AI_CHAT_PROVIDER',
    apiKey: 'AI_CHAT_API_KEY',
    model: 'AI_CHAT_MODEL',
    baseUrl: 'AI_CHAT_BASE_URL',
    timeoutMs: 'AI_CHAT_TIMEOUT_MS',
    maxRetries: 'AI_CHAT_MAX_RETRIES',
    streamUsage: 'AI_CHAT_STREAM_USAGE',
    temperature: 'AI_CHAT_TEMPERATURE',
    headers: 'AI_CHAT_HEADERS_JSON',
  },
  embedding: {
    provider: 'AI_EMBEDDING_PROVIDER',
    apiKey: 'AI_EMBEDDING_API_KEY',
    model: 'AI_EMBEDDING_MODEL',
    baseUrl: 'AI_EMBEDDING_BASE_URL',
    dimensions: 'AI_EMBEDDING_DIMENSIONS',
    batchSize: 'AI_EMBEDDING_BATCH_SIZE',
    timeoutMs: 'AI_EMBEDDING_TIMEOUT_MS',
    maxRetries: 'AI_EMBEDDING_MAX_RETRIES',
    headers: 'AI_EMBEDDING_HEADERS_JSON',
  },
  app: { name: 'AI_APP_NAME', url: 'AI_APP_URL' },
} as const satisfies {
  [TSection in keyof AiConfigInput]-?: {
    [TField in keyof AiConfigInput[TSection]]-?: keyof AiEnv
  }
}

type ConfigSection = keyof typeof AI_ENV_NAMES

function isConfigSection(key: PropertyKey | undefined): key is ConfigSection {
  return typeof key === 'string' && Object.hasOwn(AI_ENV_NAMES, key)
}

function envNameAt([section, field]: readonly PropertyKey[]): string | undefined {
  if (!isConfigSection(section) || typeof field !== 'string') return undefined
  const names: Readonly<Record<string, string>> = AI_ENV_NAMES[section]
  return Object.hasOwn(names, field) ? names[field] : undefined
}

function toEnvIssue(issue: z.core.$ZodIssue): z.core.$ZodIssue {
  const name = envNameAt(issue.path)
  return name === undefined ? issue : { ...issue, path: [name] }
}

/** Throws a ZodError whose issue paths are the variable names. */
export function aiConfigFromEnv(env: AiEnv): AiConfig {
  const input = {
    chat: {
      provider: env.AI_CHAT_PROVIDER,
      apiKey: env.AI_CHAT_API_KEY,
      model: env.AI_CHAT_MODEL,
      baseUrl: env.AI_CHAT_BASE_URL,
      timeoutMs: env.AI_CHAT_TIMEOUT_MS,
      maxRetries: env.AI_CHAT_MAX_RETRIES,
      streamUsage: env.AI_CHAT_STREAM_USAGE,
      temperature: env.AI_CHAT_TEMPERATURE,
      headers: env.AI_CHAT_HEADERS_JSON,
    },
    embedding: {
      provider: env.AI_EMBEDDING_PROVIDER,
      apiKey: env.AI_EMBEDDING_API_KEY,
      model: env.AI_EMBEDDING_MODEL,
      baseUrl: env.AI_EMBEDDING_BASE_URL,
      dimensions: env.AI_EMBEDDING_DIMENSIONS,
      batchSize: env.AI_EMBEDDING_BATCH_SIZE,
      timeoutMs: env.AI_EMBEDDING_TIMEOUT_MS,
      maxRetries: env.AI_EMBEDDING_MAX_RETRIES,
      headers: env.AI_EMBEDDING_HEADERS_JSON,
    },
    app: { name: env.AI_APP_NAME, url: env.AI_APP_URL },
  } satisfies AiConfigInput
  const result = aiConfigSchema.safeParse(input)
  if (result.success) return result.data
  throw new z.ZodRealError(result.error.issues.map(toEnvIssue))
}
