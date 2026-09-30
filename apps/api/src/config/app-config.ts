import { aiConfigFromEnv } from '@kb/ai'
import type { LogLevel } from '@nestjs/common'
import { z } from 'zod'

import type { AiSetup, AppConfig } from './app-config.types.js'
import { LOG_LEVELS } from './config.constants.js'
import { describeEnvIssues } from './env-issues.js'
import { type Env, envSchema } from './env.schema.js'

export function loadAppConfig(source: Readonly<Record<string, string | undefined>>): AppConfig {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const details = z.prettifyError(result.error)
    throw new Error(`Invalid environment variables (see .env.example):\n${details}`)
  }
  return buildAppConfig(result.data)
}

function buildAppConfig(env: Env): AppConfig {
  return {
    app: { port: env.API_PORT, webOrigin: env.WEB_ORIGIN, logLevels: logLevelsUpTo(env.LOG_LEVEL) },
    supabase: {
      url: env.SUPABASE_URL,
      publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
      secretKey: env.SUPABASE_SECRET_KEY,
    },
    ai: resolveAiSetup(env),
    rag: {
      retrievalMode: env.RAG_RETRIEVAL_MODE,
      queryRewrite: env.RAG_QUERY_REWRITE,
      vectorK: env.RAG_VECTOR_K,
      keywordK: env.RAG_KEYWORD_K,
      topN: env.RAG_TOP_N,
      minSimilarity: env.RAG_MIN_SIMILARITY,
      rrfK: env.RAG_RRF_K,
      contextTokenBudget: env.RAG_CONTEXT_TOKEN_BUDGET,
      historyTokenBudget: env.RAG_HISTORY_TOKEN_BUDGET,
      maxAnswerTokens: env.RAG_MAX_ANSWER_TOKENS,
    },
    ingestion: {
      workerEnabled: env.INGESTION_WORKER_ENABLED,
      sweepIntervalMs: env.INGESTION_SWEEP_INTERVAL_MS,
      batchSize: env.INGESTION_BATCH_SIZE,
      staleAfterMinutes: env.INGESTION_STALE_AFTER_MINUTES,
      maxAttempts: env.INGESTION_MAX_ATTEMPTS,
    },
    rateLimit: {
      defaultPerMinute: env.RATE_LIMIT_DEFAULT_PER_MINUTE,
      chatPerMinute: env.RATE_LIMIT_CHAT_PER_MINUTE,
    },
  }
}

// An incomplete AI setup (e.g. no API key yet) must not stop the API: it boots with AI unconfigured.
function resolveAiSetup(env: Env): AiSetup {
  try {
    return { configured: true, config: aiConfigFromEnv(env) }
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error
    return {
      configured: false,
      problem: `AI is not configured: ${describeEnvIssues(error.issues)}`,
    }
  }
}

function logLevelsUpTo(level: LogLevel): LogLevel[] {
  return LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(level) + 1)
}
