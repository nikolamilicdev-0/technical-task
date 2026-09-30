import { abortError } from '../errors/abort-error.js'
import type { ProviderCallContext } from '../errors/ai-provider-error.types.js'
import type {
  ChatCompletion,
  ChatModel,
  ChatRequest,
  ChatStreamEvent,
} from '../ports/chat-model.types.js'
import { FAKE_PROVIDER } from './fake-constants.js'
import type { FakeChatModelOptions, FakeChatReply } from './fake-models.types.js'
import { nextMacrotask } from './next-macrotask.js'

const FAKE_CHAT_MODEL = 'fake-chat'
const DEFAULT_REPLY: FakeChatReply = { text: 'This is a fake reply.' }
const DEFAULT_CHUNK_SIZE = 8

export class FakeChatModel implements ChatModel {
  readonly provider: string
  readonly model: string
  readonly requests: ChatRequest[] = []
  readonly #replies: FakeChatReply[]
  readonly #defaultReply: FakeChatReply
  readonly #chunkSize: number
  readonly #context: ProviderCallContext

  constructor({
    provider = FAKE_PROVIDER,
    model = FAKE_CHAT_MODEL,
    replies = [],
    defaultReply = DEFAULT_REPLY,
    chunkSize = DEFAULT_CHUNK_SIZE,
  }: FakeChatModelOptions = {}) {
    if (!Number.isInteger(chunkSize) || chunkSize < 1) {
      throw new RangeError(`chunkSize must be a positive integer, got ${chunkSize}`)
    }
    this.provider = provider
    this.model = model
    this.#replies = replies.map(toReply)
    this.#defaultReply = toReply(defaultReply)
    this.#chunkSize = chunkSize
    this.#context = { kind: 'chat', provider, model }
  }

  async complete(request: ChatRequest): Promise<ChatCompletion> {
    const reply = this.#take(request)
    await nextMacrotask()
    this.#throwIfAborted(request.signal)
    if (reply.error) throw reply.error
    return {
      text: reply.text ?? '',
      finishReason: reply.finishReason ?? 'stop',
      usage: reply.usage,
      model: this.model,
    }
  }

  async *stream(request: ChatRequest): AsyncGenerator<ChatStreamEvent, void, undefined> {
    const reply = this.#take(request)
    for (const text of splitByCodePoints(reply.text ?? '', this.#chunkSize)) {
      await nextMacrotask()
      this.#throwIfAborted(request.signal)
      yield { type: 'delta', text }
    }
    await nextMacrotask()
    this.#throwIfAborted(request.signal)
    if (reply.error) throw reply.error
    const finishReason = reply.finishReason ?? 'stop'
    yield { type: 'done', finishReason, usage: reply.usage, model: this.model }
  }

  #take(request: ChatRequest): FakeChatReply {
    this.requests.push(request)
    return this.#replies.shift() ?? this.#defaultReply
  }

  #throwIfAborted(signal: AbortSignal | undefined): void {
    if (signal?.aborted) throw abortError(this.#context, signal.reason)
  }
}

function toReply(reply: string | FakeChatReply): FakeChatReply {
  return typeof reply === 'string' ? { text: reply } : reply
}

// Code points, not UTF-16 units, so an emoji never straddles two deltas.
function splitByCodePoints(text: string, size: number): string[] {
  const codePoints = Array.from(text)
  const chunks: string[] = []
  for (let start = 0; start < codePoints.length; start += size) {
    chunks.push(codePoints.slice(start, start + size).join(''))
  }
  return chunks
}
