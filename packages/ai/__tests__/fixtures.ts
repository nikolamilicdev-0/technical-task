import { type AiConfig, type AiConfigInput, aiConfigSchema, AiProviderError } from '@kb/ai'
import type { ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat/completions'
import type { CompletionUsage } from 'openai/resources/completions'
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings'

import type {
  ResolvedChatEndpoint,
  ResolvedEmbeddingEndpoint,
} from '../src/providers/resolve-endpoint.types.js'

type FinishReasonValue = ChatCompletionChunk.Choice['finish_reason']

export const CREATED_AT = 1_790_000_000
export const TEST_API_KEY = 'sk-test'
export const SERVED_CHAT_MODEL = 'gpt-4o-mini-2024-07-18'

export const USAGE: CompletionUsage = { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 }

/** A streamed chunk carrying one choice. */
export function contentChunk(
  content: string | null,
  finishReason: FinishReasonValue = null
): ChatCompletionChunk {
  return {
    id: 'chatcmpl-1',
    object: 'chat.completion.chunk',
    created: CREATED_AT,
    model: SERVED_CHAT_MODEL,
    choices: [{ index: 0, delta: { content }, finish_reason: finishReason }],
    usage: null,
  }
}

/** The trailing chunk `stream_options.include_usage` adds: no choices, only usage. */
export function usageChunk(usage: CompletionUsage = USAGE): ChatCompletionChunk {
  return { ...contentChunk(null), choices: [], usage }
}

export function buildCompletion(
  content: string | null,
  overrides: Partial<ChatCompletion> = {}
): ChatCompletion {
  return {
    id: 'chatcmpl-2',
    object: 'chat.completion',
    created: CREATED_AT,
    model: SERVED_CHAT_MODEL,
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        logprobs: null,
        message: { role: 'assistant', content, refusal: null },
      },
    ],
    usage: USAGE,
    ...overrides,
  }
}

/** Embedding response listing `vectors` under the given indices (input order by default). */
export function buildEmbeddingResponse(
  vectors: number[][],
  indices: number[] = vectors.map((_, index) => index)
): CreateEmbeddingResponse {
  return {
    object: 'list',
    model: 'text-embedding-3-small',
    data: vectors.map((embedding, position) => ({
      object: 'embedding',
      embedding,
      index: indices[position] ?? position,
    })),
    usage: { prompt_tokens: 8, total_tokens: 8 },
  }
}

export function buildChatEndpoint(
  overrides: Partial<ResolvedChatEndpoint> = {}
): ResolvedChatEndpoint {
  return {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: TEST_API_KEY,
    headers: {},
    model: 'gpt-4o-mini',
    timeoutMs: 60_000,
    maxRetries: 2,
    streamUsage: true,
    maxTokensParam: 'max_completion_tokens',
    ...overrides,
  }
}

export function buildEmbeddingEndpoint(
  overrides: Partial<ResolvedEmbeddingEndpoint> = {}
): ResolvedEmbeddingEndpoint {
  return {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: TEST_API_KEY,
    headers: {},
    model: 'text-embedding-3-small',
    timeoutMs: 30_000,
    maxRetries: 2,
    supportsEmbeddingDimensions: true,
    ...overrides,
  }
}

/** A valid config: OpenAI for both models unless the sections say otherwise. */
export function buildAiConfig(
  chat: AiConfigInput['chat'] = {},
  embedding: AiConfigInput['embedding'] = {},
  app: AiConfigInput['app'] = {}
): AiConfig {
  return aiConfigSchema.parse({ chat: { apiKey: TEST_API_KEY, ...chat }, embedding, app })
}

export async function collect<TItem>(items: AsyncIterable<TItem>): Promise<TItem[]> {
  const collected: TItem[] = []
  for await (const item of items) collected.push(item)
  return collected
}

/** Runs `action` and returns the `AiProviderError` it must throw. */
export async function captureAiError(action: () => Promise<unknown>): Promise<AiProviderError> {
  try {
    await action()
  } catch (error) {
    if (error instanceof AiProviderError) return error
    throw error
  }
  throw new Error('Expected an AiProviderError')
}

/** Runs `action` and returns the `AiProviderError` it must throw synchronously. */
export function captureAiErrorSync(action: () => unknown): AiProviderError {
  try {
    action()
  } catch (error) {
    if (error instanceof AiProviderError) return error
    throw error
  }
  throw new Error('Expected an AiProviderError')
}
