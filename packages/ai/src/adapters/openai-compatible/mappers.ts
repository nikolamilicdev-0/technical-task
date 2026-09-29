import type {
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam,
  ChatCompletion as OpenAiChatCompletion,
} from 'openai/resources/chat/completions'
import type { CompletionUsage } from 'openai/resources/completions'
import type { CreateEmbeddingResponse, EmbeddingCreateParams } from 'openai/resources/embeddings'

import type {
  ChatCompletion,
  ChatMessage,
  ChatRequest,
  FinishReason,
  TokenUsage,
} from '../../ports/chat-model.types.js'
import type { MaxTokensParam } from '../../providers/provider-profiles.types.js'
import type {
  ResolvedChatEndpoint,
  ResolvedEmbeddingEndpoint,
} from '../../providers/resolve-endpoint.types.js'

const FINISH_REASONS: ReadonlyMap<string, FinishReason> = new Map([
  ['stop', 'stop'],
  ['length', 'length'],
  ['content_filter', 'content_filter'],
])

/** Request body shared by `complete()` and `stream()`; optional knobs are sent only when set. */
export function toChatParams(
  endpoint: ResolvedChatEndpoint,
  request: ChatRequest
): ChatCompletionCreateParamsBase {
  const temperature = request.temperature ?? endpoint.temperature
  return {
    model: endpoint.model,
    messages: request.messages.map(toOpenAiMessage),
    ...toMaxTokensParams(endpoint.maxTokensParam, request.maxTokens),
    ...(temperature === undefined ? {} : { temperature }),
  }
}

function toOpenAiMessage({ role, content }: ChatMessage): ChatCompletionMessageParam {
  return { role, content }
}

function toMaxTokensParams(
  param: MaxTokensParam,
  maxTokens: number | undefined
): Pick<ChatCompletionCreateParamsBase, MaxTokensParam> {
  if (maxTokens === undefined) return {}
  return param === 'max_tokens' ? { max_tokens: maxTokens } : { max_completion_tokens: maxTokens }
}

/** Normalizes a provider finish reason; missing or unrecognized values become `unknown`. */
export function toFinishReason(reason: string | null | undefined): FinishReason {
  if (!reason) return 'unknown'
  return FINISH_REASONS.get(reason) ?? 'unknown'
}

/** Maps chat or embedding usage; embedding responses have no completion tokens. */
export function toTokenUsage(usage: CompletionUsage | CreateEmbeddingResponse.Usage): TokenUsage {
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: 'completion_tokens' in usage ? usage.completion_tokens : 0,
    totalTokens: usage.total_tokens,
  }
}

/** Maps a non-streamed completion, preferring the model name the provider reports. */
export function toChatCompletion(
  response: OpenAiChatCompletion,
  fallbackModel: string
): ChatCompletion {
  const choice = response.choices.at(0)
  return {
    text: choice?.message.content ?? '',
    finishReason: toFinishReason(choice?.finish_reason),
    usage: response.usage === undefined ? undefined : toTokenUsage(response.usage),
    model: response.model || fallbackModel,
  }
}

/** Embedding request body: always floats, `dimensions` only where the provider accepts it. */
export function toEmbeddingParams(
  endpoint: ResolvedEmbeddingEndpoint,
  texts: readonly string[]
): EmbeddingCreateParams {
  const sendDimensions = endpoint.supportsEmbeddingDimensions && endpoint.dimensions !== undefined
  return {
    model: endpoint.model,
    input: [...texts],
    // Left unset, the SDK asks for base64, which many OpenAI-compatible servers cannot produce.
    encoding_format: 'float',
    ...(sendDimensions ? { dimensions: endpoint.dimensions } : {}),
  }
}
