import { z } from 'zod'

import type { AiModelKind } from '../errors/ai-provider-error.types.js'
import { PROVIDER_IDS, type ProviderId } from '../providers/provider-ids.js'
import { PROVIDER_PROFILES } from '../providers/provider-profiles.js'
import type { ProviderProfile } from '../providers/provider-profiles.types.js'

const DEFAULT_CHAT_PROVIDER = 'openai' satisfies ProviderId
const CHAT_TIMEOUT_MS_DEFAULT = 60_000
const EMBEDDING_TIMEOUT_MS_DEFAULT = 30_000
const MAX_RETRIES_DEFAULT = 2
const EMBEDDING_BATCH_SIZE_DEFAULT = 32
const TEMPERATURE_MAX = 2
// Without a scheme, `localhost:11434/v1` would parse as a URL whose protocol is `localhost:`.
const HTTP_URL_PROTOCOL = /^https?$/

const EMBEDDING_PROVIDER_IDS = PROVIDER_IDS.filter((id) => PROVIDER_PROFILES[id].supportsEmbeddings)

/** Accepted provider ids. */
export const providerIdSchema = z.enum(PROVIDER_IDS)

/** Extra request headers: header name to value. */
export const headersSchema = z.record(
  z.string().min(1),
  z.string(),
  'Expected an object mapping header names to string values'
)

const textSchema = z.string().min(1)
const httpUrlSchema = z.url({ protocol: HTTP_URL_PROTOCOL, error: 'Expected an http(s) URL' })
const timeoutMsSchema = z.number().int().positive()
const maxRetriesSchema = z.number().int().nonnegative().default(MAX_RETRIES_DEFAULT)

const connectionShape = {
  model: textSchema.optional(),
  apiKey: textSchema.optional(),
  baseUrl: httpUrlSchema.optional(),
  headers: headersSchema.optional(),
  maxRetries: maxRetriesSchema,
}

const configShapeSchema = z.object({
  chat: z.object({
    ...connectionShape,
    provider: providerIdSchema.default(DEFAULT_CHAT_PROVIDER),
    timeoutMs: timeoutMsSchema.default(CHAT_TIMEOUT_MS_DEFAULT),
    streamUsage: z.boolean().optional(),
    temperature: z.number().min(0).max(TEMPERATURE_MAX).optional(),
  }),
  embedding: z.object({
    ...connectionShape,
    provider: providerIdSchema.optional(),
    timeoutMs: timeoutMsSchema.default(EMBEDDING_TIMEOUT_MS_DEFAULT),
    dimensions: z.number().int().positive().optional(),
    batchSize: z.number().int().positive().default(EMBEDDING_BATCH_SIZE_DEFAULT),
  }),
  app: z.object({ name: textSchema.optional(), url: httpUrlSchema.optional() }),
})

interface ProfileIssue {
  path: [AiModelKind, string]
  message: string
}

// Unset embedding connection settings follow chat's when both sides use the same provider.
function inheritEmbeddingConnection({ chat, embedding, app }: z.output<typeof configShapeSchema>) {
  const provider = embedding.provider ?? chat.provider
  const source = provider === chat.provider ? chat : undefined
  return {
    chat,
    app,
    embedding: {
      ...embedding,
      provider,
      apiKey: embedding.apiKey ?? source?.apiKey,
      baseUrl: embedding.baseUrl ?? source?.baseUrl,
      headers: embedding.headers ?? source?.headers,
    },
  }
}

function findProfileIssues({
  chat,
  embedding,
}: ReturnType<typeof inheritEmbeddingConnection>): ProfileIssue[] {
  const chatProfile = PROVIDER_PROFILES[chat.provider]
  const embeddingProfile = PROVIDER_PROFILES[embedding.provider]
  const chatIssues = [
    ...findConnectionIssues('chat', chatProfile, chat),
    ...findModelIssues('chat', chatProfile, chat.model, chatProfile.defaultChatModel),
  ]
  if (!embeddingProfile.supportsEmbeddings) {
    const message = `${embeddingProfile.label} does not serve embeddings; use one of: ${EMBEDDING_PROVIDER_IDS.join(', ')}`
    return [...chatIssues, { path: ['embedding', 'provider'], message }]
  }
  // With a shared provider any connection gap was inherited from chat: report it once, there.
  const connectionIssues =
    embedding.provider === chat.provider
      ? []
      : findConnectionIssues('embedding', embeddingProfile, embedding)
  const { defaultEmbeddingModel } = embeddingProfile
  return [
    ...chatIssues,
    ...connectionIssues,
    ...findModelIssues('embedding', embeddingProfile, embedding.model, defaultEmbeddingModel),
  ]
}

function findConnectionIssues(
  kind: AiModelKind,
  profile: ProviderProfile,
  connection: { apiKey?: string; baseUrl?: string }
): ProfileIssue[] {
  const issues: ProfileIssue[] = []
  if (connection.baseUrl === undefined && profile.defaultBaseUrl === undefined) {
    issues.push({ path: [kind, 'baseUrl'], message: `${profile.label} needs a base URL` })
  }
  if (connection.apiKey === undefined && profile.requiresApiKey) {
    issues.push({ path: [kind, 'apiKey'], message: `${profile.label} requires an API key` })
  }
  return issues
}

function findModelIssues(
  kind: AiModelKind,
  profile: ProviderProfile,
  model: string | undefined,
  defaultModel: string | undefined
): ProfileIssue[] {
  if (model !== undefined || defaultModel !== undefined) return []
  const message = `${profile.label} has no default ${kind} model; name one`
  return [{ path: [kind, 'model'], message }]
}

/** Nested AI configuration, validated against the provider profiles. */
export const aiConfigSchema = configShapeSchema
  .transform(inheritEmbeddingConnection)
  .superRefine((config, ctx) => {
    for (const issue of findProfileIssues(config)) ctx.addIssue({ code: 'custom', ...issue })
  })

export type AiConfigInput = z.input<typeof aiConfigSchema>
export type AiConfig = z.output<typeof aiConfigSchema>
