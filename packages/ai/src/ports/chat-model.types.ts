export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatRequest {
  messages: readonly ChatMessage[]
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type FinishReason = 'stop' | 'length' | 'content_filter' | 'unknown'

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

/** Implementations throw `AiProviderError` only. */
export interface ChatModel {
  readonly provider: string
  readonly model: string
  complete(request: ChatRequest): Promise<ChatCompletion>
  stream(request: ChatRequest): AsyncIterable<ChatStreamEvent>
}
