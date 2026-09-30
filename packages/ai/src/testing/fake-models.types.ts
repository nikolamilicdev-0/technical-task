import type { FinishReason, TokenUsage } from '../ports/chat-model.types.js'

/** One scripted answer; `error` is thrown after `text` has been streamed. */
export interface FakeChatReply {
  readonly text?: string
  readonly finishReason?: FinishReason
  readonly usage?: TokenUsage
  readonly error?: Error
}

export interface FakeChatModelOptions {
  readonly provider?: string
  readonly model?: string
  readonly replies?: ReadonlyArray<string | FakeChatReply>
  readonly defaultReply?: string | FakeChatReply
  /** Code points per streamed delta. */
  readonly chunkSize?: number
}

export interface FakeEmbeddingModelOptions {
  readonly provider?: string
  readonly model?: string
  readonly dimensions?: number
  readonly failures?: readonly Error[]
}
