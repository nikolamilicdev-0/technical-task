// Ports: the only types application code depends on.
export type {
  ChatCompletion,
  ChatMessage,
  ChatModel,
  ChatRequest,
  ChatRole,
  ChatStreamEvent,
  FinishReason,
  TokenUsage,
} from './ports/chat-model.types.js'
export type {
  EmbeddingModel,
  EmbeddingRequest,
  EmbeddingResult,
} from './ports/embedding-model.types.js'

// Errors
export { AiProviderError } from './errors/ai-provider-error.js'
export type { AiErrorCode, AiProviderErrorDetails } from './errors/ai-provider-error.types.js'

// Configuration
export { aiConfigSchema } from './config/ai-config.schema.js'
export type { AiConfig, AiConfigInput } from './config/ai-config.schema.js'
export { aiConfigFromEnv, aiEnvSchema } from './config/ai-env.schema.js'
export type { AiEnv } from './config/ai-env.schema.js'
export type { ProviderId } from './providers/provider-ids.js'

// Factory and its test seam
export { createAiClients } from './factory/create-ai-clients.js'
export type { AiClients, AiClientsDeps } from './factory/create-ai-clients.types.js'
export type {
  CreateOpenAiClient,
  OpenAiLikeClient,
  OpenAiRequestOptions,
} from './adapters/openai-compatible/openai-like-client.types.js'
export type { ResolvedEndpoint } from './providers/resolve-endpoint.types.js'

// Deterministic test doubles for consumers' unit tests
export { FakeChatModel } from './testing/fake-chat-model.js'
export { FakeEmbeddingModel } from './testing/fake-embedding-model.js'
export type {
  FakeChatModelOptions,
  FakeChatReply,
  FakeEmbeddingModelOptions,
} from './testing/fake-models.types.js'
