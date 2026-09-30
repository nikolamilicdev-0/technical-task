const SIGNATURE_SEPARATOR = '#'

export function toEmbeddingSignature(model: string, dimensions: number | undefined): string {
  return dimensions === undefined ? model : `${model}${SIGNATURE_SEPARATOR}${dimensions}`
}

export function findEmbeddingInputProblem(texts: readonly string[]): string | undefined {
  if (texts.length === 0) return 'Nothing to embed: no texts were given'
  if (texts.includes('')) return 'Cannot embed an empty text'
  return undefined
}
