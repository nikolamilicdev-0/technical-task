const SIGNATURE_SEPARATOR = '#'

/** The `EmbeddingModel.signature` format: `model`, or `model#dimensions` when a size is configured. */
export function toEmbeddingSignature(model: string, dimensions: number | undefined): string {
  return dimensions === undefined ? model : `${model}${SIGNATURE_SEPARATOR}${dimensions}`
}

/** Why a batch cannot be embedded, or `undefined` when it can. */
export function findEmbeddingInputProblem(texts: readonly string[]): string | undefined {
  if (texts.length === 0) return 'Nothing to embed: no texts were given'
  if (texts.includes('')) return 'Cannot embed an empty text'
  return undefined
}
