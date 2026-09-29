import type { AiConfig } from '../config/ai-config.schema.js'
import { AiProviderError } from '../errors/ai-provider-error.js'
import { PROVIDER_PROFILES } from './provider-profiles.js'
import type { ProviderProfile } from './provider-profiles.types.js'
import type {
  ResolvedChatEndpoint,
  ResolvedEmbeddingEndpoint,
  ResolvedEndpoint,
} from './resolve-endpoint.types.js'

type ConnectionConfig = AiConfig['chat'] | AiConfig['embedding']

/** Applies the chat config over its provider profile; configured values always win. */
export function resolveChatEndpoint(config: AiConfig): ResolvedChatEndpoint {
  const { chat, app } = config
  const profile = PROVIDER_PROFILES[chat.provider]
  return {
    ...resolveConnection(profile, chat, app, profile.defaultChatModel),
    streamUsage: chat.streamUsage ?? profile.supportsStreamUsage,
    maxTokensParam: profile.maxTokensParam,
    temperature: chat.temperature,
  }
}

/** Applies the embedding config over its provider profile; configured values always win. */
export function resolveEmbeddingEndpoint(config: AiConfig): ResolvedEmbeddingEndpoint {
  const { embedding, app } = config
  const profile = PROVIDER_PROFILES[embedding.provider]
  if (!profile.supportsEmbeddings) {
    throw unsupported(profile, `${profile.label} does not serve embeddings`)
  }
  return {
    ...resolveConnection(profile, embedding, app, profile.defaultEmbeddingModel),
    dimensions: embedding.dimensions ?? defaultDimensions(profile),
    supportsEmbeddingDimensions: profile.supportsEmbeddingDimensions,
  }
}

// `aiConfigSchema` already rejects these gaps; the checks guard hand-built configs.
function resolveConnection(
  profile: ProviderProfile,
  connection: ConnectionConfig,
  app: AiConfig['app'],
  defaultModel: string | undefined
): ResolvedEndpoint {
  const baseUrl = connection.baseUrl ?? profile.defaultBaseUrl
  const apiKey =
    connection.apiKey ?? (profile.requiresApiKey ? undefined : profile.placeholderApiKey)
  const model = connection.model ?? defaultModel
  if (baseUrl === undefined) throw unsupported(profile, `${profile.label} needs a base URL`)
  if (apiKey === undefined) throw unsupported(profile, `${profile.label} requires an API key`)
  if (model === undefined) throw unsupported(profile, `${profile.label} has no default model`)
  return {
    provider: profile.id,
    baseUrl,
    apiKey,
    model,
    headers: { ...attributionHeaders(profile, app), ...connection.headers },
    timeoutMs: connection.timeoutMs,
    maxRetries: connection.maxRetries,
  }
}

function attributionHeaders(
  profile: ProviderProfile,
  app: AiConfig['app']
): Record<string, string> {
  const names = profile.attributionHeaders
  if (names === undefined) return {}
  const headers: Record<string, string> = {}
  if (app.name !== undefined) headers[names.appName] = app.name
  if (app.url !== undefined) headers[names.appUrl] = app.url
  return headers
}

function defaultDimensions(profile: ProviderProfile): number | undefined {
  return profile.supportsEmbeddingDimensions ? profile.defaultEmbeddingDimensions : undefined
}

function unsupported(profile: ProviderProfile, message: string): AiProviderError {
  return new AiProviderError('unsupported', message, { provider: profile.id })
}
