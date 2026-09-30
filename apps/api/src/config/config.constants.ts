export const APP_CONFIG = Symbol('APP_CONFIG')

/** Nest log levels from least to most verbose; `LOG_LEVEL` enables its own and every one before it. */
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'] as const

export const RETRIEVAL_MODES = ['hybrid', 'vector'] as const

export const PORT_MAX = 65_535
// Node runs a timer with a longer delay after 1 ms instead.
export const TIMER_DELAY_MAX_MS = 2_147_483_647
export const COSINE_SIMILARITY_MIN = -1
export const COSINE_SIMILARITY_MAX = 1

export const ENV_DEFAULTS = {
  API_PORT: 4000,
  WEB_ORIGIN: 'http://localhost:3000',
  LOG_LEVEL: 'log',
  RAG_RETRIEVAL_MODE: 'hybrid',
  RAG_QUERY_REWRITE: true,
  RAG_VECTOR_K: 20,
  RAG_KEYWORD_K: 20,
  RAG_TOP_N: 6,
  RAG_MIN_SIMILARITY: 0,
  RAG_RRF_K: 60,
  RAG_CONTEXT_TOKEN_BUDGET: 3000,
  RAG_HISTORY_TOKEN_BUDGET: 2000,
  RAG_MAX_ANSWER_TOKENS: 1024,
  INGESTION_WORKER_ENABLED: true,
  INGESTION_SWEEP_INTERVAL_MS: 30_000,
  INGESTION_BATCH_SIZE: 5,
  INGESTION_STALE_AFTER_MINUTES: 10,
  INGESTION_MAX_ATTEMPTS: 5,
  RATE_LIMIT_DEFAULT_PER_MINUTE: 120,
  RATE_LIMIT_CHAT_PER_MINUTE: 20,
} as const
