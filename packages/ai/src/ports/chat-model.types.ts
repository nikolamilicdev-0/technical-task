/** Author of one chat message. */
export type ChatRole = 'system' | 'user' | 'assistant'

/** One message of a chat prompt. */
export interface ChatMessage {
  role: ChatRole
  content: string
}

/** Provider-neutral chat request; unset options fall back to the configured defaults. */
export interface ChatRequest {
  messages: readonly ChatMessage[]
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

/** Token counts as reported by the provider. */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** Why generation stopped; `unknown` when the provider did not say. */
export type FinishReason = 'stop' | 'length' | 'content_filter' | 'unknown'

/** A whole (non-streamed) chat answer. */
export interface ChatCompletion {
  text: string
  finishReason: FinishReason
  usage?: TokenUsage
  model: string
}

/** Streamed answer: any number of `delta`s, then exactly one `done` unless the stream throws. */
export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; finishReason: FinishReason; usage?: TokenUsage; model: string }

/** Chat port; implementations throw `AiProviderError` only. */
export interface ChatModel {
  readonly provider: string
  readonly model: string
  complete(request: ChatRequest): Promise<ChatCompletion>
  stream(request: ChatRequest): AsyncIterable<ChatStreamEvent>
}
