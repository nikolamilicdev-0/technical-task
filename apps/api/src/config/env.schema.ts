import { aiEnvSchema } from '@kb/ai'
import { z } from 'zod'

import {
  COSINE_SIMILARITY_MAX,
  COSINE_SIMILARITY_MIN,
  ENV_DEFAULTS,
  LOG_LEVELS,
  PORT_MAX,
  RETRIEVAL_MODES,
} from './config.constants.js'

// Without a scheme, `localhost:54321` would parse as a URL whose protocol is `localhost:`.
const HTTP_URL_PROTOCOL = /^https?$/

function normalizeEnvValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Blank values count as unset, so `KEY=` falls back to the default (the same rule as `@kb/ai`). */
function envVar<TSchema extends z.ZodType>(schema: TSchema) {
  return z.preprocess(normalizeEnvValue, schema)
}

const httpUrl = z.url({ protocol: HTTP_URL_PROTOCOL, error: 'Expected an http(s) URL' })
const requiredText = z.string().min(1)
const positiveInt = z.coerce.number().int().positive()
const flag = z.stringbool()

/** Variables the API reads itself; `@kb/ai` owns and decodes the `AI_*` ones. */
export const apiEnvShape = {
  API_PORT: envVar(z.coerce.number().int().min(1).max(PORT_MAX).default(ENV_DEFAULTS.API_PORT)),
  // CORS compares origins exactly, so a trailing slash or path must not survive.
  WEB_ORIGIN: envVar(
    httpUrl.transform((url) => new URL(url).origin).default(ENV_DEFAULTS.WEB_ORIGIN)
  ),
  LOG_LEVEL: envVar(z.enum(LOG_LEVELS).default(ENV_DEFAULTS.LOG_LEVEL)),
  SUPABASE_URL: envVar(httpUrl),
  SUPABASE_PUBLISHABLE_KEY: envVar(requiredText),
  SUPABASE_SECRET_KEY: envVar(requiredText),
  RAG_RETRIEVAL_MODE: envVar(z.enum(RETRIEVAL_MODES).default(ENV_DEFAULTS.RAG_RETRIEVAL_MODE)),
  RAG_QUERY_REWRITE: envVar(flag.default(ENV_DEFAULTS.RAG_QUERY_REWRITE)),
  RAG_VECTOR_K: envVar(positiveInt.default(ENV_DEFAULTS.RAG_VECTOR_K)),
  RAG_KEYWORD_K: envVar(positiveInt.default(ENV_DEFAULTS.RAG_KEYWORD_K)),
  RAG_TOP_N: envVar(positiveInt.default(ENV_DEFAULTS.RAG_TOP_N)),
  RAG_MIN_SIMILARITY: envVar(
    z.coerce
      .number()
      .min(COSINE_SIMILARITY_MIN)
      .max(COSINE_SIMILARITY_MAX)
      .default(ENV_DEFAULTS.RAG_MIN_SIMILARITY)
  ),
  RAG_RRF_K: envVar(positiveInt.default(ENV_DEFAULTS.RAG_RRF_K)),
  RAG_CONTEXT_TOKEN_BUDGET: envVar(positiveInt.default(ENV_DEFAULTS.RAG_CONTEXT_TOKEN_BUDGET)),
  RAG_HISTORY_TOKEN_BUDGET: envVar(positiveInt.default(ENV_DEFAULTS.RAG_HISTORY_TOKEN_BUDGET)),
  RAG_MAX_ANSWER_TOKENS: envVar(positiveInt.default(ENV_DEFAULTS.RAG_MAX_ANSWER_TOKENS)),
  INGESTION_WORKER_ENABLED: envVar(flag.default(ENV_DEFAULTS.INGESTION_WORKER_ENABLED)),
  INGESTION_SWEEP_INTERVAL_MS: envVar(
    positiveInt.default(ENV_DEFAULTS.INGESTION_SWEEP_INTERVAL_MS)
  ),
  INGESTION_BATCH_SIZE: envVar(positiveInt.default(ENV_DEFAULTS.INGESTION_BATCH_SIZE)),
  INGESTION_STALE_AFTER_MINUTES: envVar(
    positiveInt.default(ENV_DEFAULTS.INGESTION_STALE_AFTER_MINUTES)
  ),
  INGESTION_MAX_ATTEMPTS: envVar(positiveInt.default(ENV_DEFAULTS.INGESTION_MAX_ATTEMPTS)),
  RATE_LIMIT_DEFAULT_PER_MINUTE: envVar(
    positiveInt.default(ENV_DEFAULTS.RATE_LIMIT_DEFAULT_PER_MINUTE)
  ),
  RATE_LIMIT_CHAT_PER_MINUTE: envVar(positiveInt.default(ENV_DEFAULTS.RATE_LIMIT_CHAT_PER_MINUTE)),
}

/** Every variable the API process reads; unknown variables are ignored. */
export const envSchema = z.object({ ...apiEnvShape, ...aiEnvSchema.shape })
export type Env = z.output<typeof envSchema>
