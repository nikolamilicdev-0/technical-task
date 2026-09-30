import {
  type AiClients,
  AiProviderError,
  type ChatCompletion,
  type ChatModel,
  type ChatStreamEvent,
  type EmbeddingModel,
  type EmbeddingResult,
} from '@kb/ai'

import { UNCONFIGURED_MODEL } from './ai.constants.js'

type FailureFactory = () => AiProviderError

export function createUnconfiguredAiClients(problem: string): AiClients {
  const fail: FailureFactory = () =>
    new AiProviderError('unsupported', problem, { provider: UNCONFIGURED_MODEL })
  return { chat: new UnconfiguredChatModel(fail), embedding: new UnconfiguredEmbeddingModel(fail) }
}

class UnconfiguredChatModel implements ChatModel {
  readonly provider = UNCONFIGURED_MODEL
  readonly model = UNCONFIGURED_MODEL

  constructor(private readonly fail: FailureFactory) {}

  complete(): Promise<ChatCompletion> {
    return Promise.reject(this.fail())
  }

  stream(): AsyncIterable<ChatStreamEvent> {
    return { [Symbol.asyncIterator]: () => ({ next: () => Promise.reject(this.fail()) }) }
  }
}

class UnconfiguredEmbeddingModel implements EmbeddingModel {
  readonly provider = UNCONFIGURED_MODEL
  readonly model = UNCONFIGURED_MODEL

  constructor(private readonly fail: FailureFactory) {}

  // Reading the signature is a use too: nothing may requeue or search chunks for a placeholder model.
  get signature(): string {
    throw this.fail()
  }

  embed(): Promise<EmbeddingResult> {
    return Promise.reject(this.fail())
  }
}
