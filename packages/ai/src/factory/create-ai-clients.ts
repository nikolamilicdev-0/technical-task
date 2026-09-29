import { createOpenAiClient } from '../adapters/openai-compatible/create-openai-client.js'
import { OpenAiCompatibleChatModel } from '../adapters/openai-compatible/openai-compatible-chat-model.js'
import { OpenAiCompatibleEmbeddingModel } from '../adapters/openai-compatible/openai-compatible-embedding-model.js'
import type { CreateOpenAiClient } from '../adapters/openai-compatible/openai-like-client.types.js'
import type { AiConfig } from '../config/ai-config.schema.js'
import type { ChatModel } from '../ports/chat-model.types.js'
import type { EmbeddingModel } from '../ports/embedding-model.types.js'
import { resolveChatEndpoint, resolveEmbeddingEndpoint } from '../providers/resolve-endpoint.js'
import type {
  ResolvedChatEndpoint,
  ResolvedEmbeddingEndpoint,
} from '../providers/resolve-endpoint.types.js'
import type { AiClients, AiClientsDeps } from './create-ai-clients.types.js'

/** Builds the chat and embedding ports described by a validated `AiConfig`. */
export function createAiClients(config: AiConfig, deps: AiClientsDeps = {}): AiClients {
  const createClient = deps.createOpenAiClient ?? createOpenAiClient
  const chatEndpoint = resolveChatEndpoint(config)
  const embeddingEndpoint = resolveEmbeddingEndpoint(config)
  return {
    chat: createChatModel(chatEndpoint, createClient),
    embedding: createEmbeddingModel(embeddingEndpoint, createClient),
  }
}

function createChatModel(
  endpoint: ResolvedChatEndpoint,
  createClient: CreateOpenAiClient
): ChatModel {
  switch (endpoint.provider) {
    // A provider with its own wire protocol (e.g. Anthropic) gets its own adapter class
    // and `case` here; nothing outside this factory changes.
    case 'openai':
    case 'groq':
    case 'together':
    case 'openrouter':
    case 'gemini':
    case 'ollama':
    case 'custom':
      return new OpenAiCompatibleChatModel(createClient(endpoint), endpoint)
  }
}

function createEmbeddingModel(
  endpoint: ResolvedEmbeddingEndpoint,
  createClient: CreateOpenAiClient
): EmbeddingModel {
  switch (endpoint.provider) {
    case 'openai':
    case 'groq':
    case 'together':
    case 'openrouter':
    case 'gemini':
    case 'ollama':
    case 'custom':
      return new OpenAiCompatibleEmbeddingModel(createClient(endpoint), endpoint)
  }
}
