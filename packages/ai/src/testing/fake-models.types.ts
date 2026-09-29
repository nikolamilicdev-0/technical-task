import type { FinishReason, TokenUsage } from '../ports/chat-model.types.js'

/** One scripted answer; `error` is thrown after `text` has been streamed. */
export interface FakeChatReply {
  readonly text?: string
  readonly finishReason?: FinishReason
  readonly usage?: TokenUsage
  readonly error?: Error
}

/** Options for `FakeChatModel`; every field has a deterministic default. */
export interface FakeChatModelOptions {
  readonly provider?: string
  readonly model?: string
  /** Consumed one per call, in order; a string is shorthand for `{ text }`. */
  readonly replies?: ReadonlyArray<string | FakeChatReply>
  /** Answers every call once `replies` has run out. */
  readonly defaultReply?: string | FakeChatReply
  /** Code points per streamed delta. */
  readonly chunkSize?: number
}

/** Options for `FakeEmbeddingModel`; every field has a deterministic default. */
export interface FakeEmbeddingModelOptions {
  readonly provider?: string
  readonly model?: string
  readonly dimensions?: number
  /** Thrown one per call, in order, before any vector is produced. */
  readonly failures?: readonly Error[]
}
