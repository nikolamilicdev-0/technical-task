import type { AiConfig } from '@kb/ai'
import type { LogLevel } from '@nestjs/common'

import type { RETRIEVAL_MODES } from './config.constants.js'

export type RetrievalMode = (typeof RETRIEVAL_MODES)[number]

export interface AppSettings {
  readonly port: number
  /** The browser origin CORS admits. */
  readonly webOrigin: string
  /** `LOG_LEVEL` and every less verbose level. */
  readonly logLevels: LogLevel[]
}

export interface SupabaseSettings {
  readonly url: string
  readonly publishableKey: string
  /** Bypasses RLS: only the ingestion worker, the usage recorder and the readiness probe use it. */
  readonly secretKey: string
}

/** The AI configuration, or why the `AI_*` variables do not form a usable one yet. */
export type AiSetup =
  | { readonly configured: true; readonly config: AiConfig }
  | { readonly configured: false; readonly problem: string }

export interface RagSettings {
  readonly retrievalMode: RetrievalMode
  readonly queryRewrite: boolean
  readonly vectorK: number
  readonly keywordK: number
  readonly topN: number
  readonly minSimilarity: number
  readonly rrfK: number
  readonly contextTokenBudget: number
  readonly historyTokenBudget: number
  readonly maxAnswerTokens: number
}

export interface IngestionSettings {
  readonly workerEnabled: boolean
  readonly sweepIntervalMs: number
  readonly batchSize: number
  readonly staleAfterMinutes: number
  readonly maxAttempts: number
}

export interface RateLimitSettings {
  readonly defaultPerMinute: number
  readonly chatPerMinute: number
}

/** Typed configuration, validated once at startup from the environment. */
export interface AppConfig {
  readonly app: AppSettings
  readonly supabase: SupabaseSettings
  readonly ai: AiSetup
  readonly rag: RagSettings
  readonly ingestion: IngestionSettings
  readonly rateLimit: RateLimitSettings
}
