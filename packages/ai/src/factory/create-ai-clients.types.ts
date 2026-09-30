import type { CreateOpenAiClient } from '../adapters/openai-compatible/openai-like-client.types.js'
import type { ChatModel } from '../ports/chat-model.types.js'
import type { EmbeddingModel } from '../ports/embedding-model.types.js'

export interface AiClients {
  readonly chat: ChatModel
  readonly embedding: EmbeddingModel
}

export interface AiClientsDeps {
  readonly createOpenAiClient?: CreateOpenAiClient
}
