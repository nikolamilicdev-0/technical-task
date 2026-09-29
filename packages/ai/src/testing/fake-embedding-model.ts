import { createHash } from 'node:crypto'

import { abortError } from '../errors/abort-error.js'
import { AiProviderError } from '../errors/ai-provider-error.js'
import type { ProviderCallContext } from '../errors/ai-provider-error.types.js'
import { findEmbeddingInputProblem, toEmbeddingSignature } from '../ports/embedding-contract.js'
import type {
  EmbeddingModel,
  EmbeddingRequest,
  EmbeddingResult,
} from '../ports/embedding-model.types.js'
import { FAKE_PROVIDER } from './fake-constants.js'
import type { FakeEmbeddingModelOptions } from './fake-models.types.js'
import { nextMacrotask } from './next-macrotask.js'

const FAKE_EMBEDDING_MODEL = 'fake-embedding'
const DEFAULT_DIMENSIONS = 8
const CHARACTERS_PER_TOKEN = 4
const HASH_ALGORITHM = 'sha256'
const BYTES_PER_VALUE = 4
const UINT32_MAX = 0xffff_ffff

/** Deterministic in-memory `EmbeddingModel`: equal texts get equal unit vectors. */
export class FakeEmbeddingModel implements EmbeddingModel {
  readonly provider: string
  readonly model: string
  readonly dimensions: number
  readonly signature: string
  /** Every request received, in call order. */
  readonly requests: EmbeddingRequest[] = []
  readonly #failures: Error[]
  readonly #context: ProviderCallContext

  constructor({
    provider = FAKE_PROVIDER,
    model = FAKE_EMBEDDING_MODEL,
    dimensions = DEFAULT_DIMENSIONS,
    failures = [],
  }: FakeEmbeddingModelOptions = {}) {
    if (!Number.isInteger(dimensions) || dimensions < 1) {
      throw new RangeError(`dimensions must be a positive integer, got ${dimensions}`)
    }
    this.provider = provider
    this.model = model
    this.dimensions = dimensions
    this.signature = toEmbeddingSignature(model, dimensions)
    this.#failures = [...failures]
    this.#context = { kind: 'embedding', provider, model }
  }

  async embed({ texts, signal }: EmbeddingRequest): Promise<EmbeddingResult> {
    this.requests.push({ texts, signal })
    await nextMacrotask()
    if (signal?.aborted) throw abortError(this.#context, signal.reason)
    const failure = this.#failures.shift()
    if (failure) throw failure
    const inputProblem = findEmbeddingInputProblem(texts)
    if (inputProblem !== undefined) {
      throw new AiProviderError('invalid_request', inputProblem, {
        provider: this.provider,
        model: this.model,
      })
    }
    const promptTokens = texts.reduce(
      (sum, text) => sum + Math.ceil(text.length / CHARACTERS_PER_TOKEN),
      0
    )
    return {
      embeddings: texts.map((text) => hashToUnitVector(text, this.dimensions)),
      dimensions: this.dimensions,
      usage: { promptTokens, completionTokens: 0, totalTokens: promptTokens },
      model: this.model,
    }
  }
}

function hashToUnitVector(text: string, dimensions: number): number[] {
  const values: number[] = []
  for (let block = 0; values.length < dimensions; block += 1) {
    values.push(...digestValues(`${block}:${text}`))
  }
  const vector = values.slice(0, dimensions)
  const norm = Math.hypot(...vector)
  return vector.map((value) => value / norm)
}

// A sha256 digest holds eight big-endian uint32 values; each is scaled into [-1, 1].
function digestValues(input: string): number[] {
  const digest = createHash(HASH_ALGORITHM).update(input).digest()
  return Array.from(
    { length: digest.length / BYTES_PER_VALUE },
    (_, index) => (digest.readUInt32BE(index * BYTES_PER_VALUE) / UINT32_MAX) * 2 - 1
  )
}
