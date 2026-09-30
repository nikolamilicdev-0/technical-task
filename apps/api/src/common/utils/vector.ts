import { VECTOR_DIMENSIONS } from '../../database/database.constants.js'

export class VectorDimensionError extends RangeError {
  override readonly name = 'VectorDimensionError'
}

export function toStoredVector(
  embedding: readonly number[],
  dimensions: number = VECTOR_DIMENSIONS
): string {
  if (embedding.length === 0) throw new VectorDimensionError('Cannot store an empty embedding')
  if (embedding.length > dimensions) {
    throw new VectorDimensionError(
      `The embedding has ${embedding.length} dimensions but the column holds ${dimensions}; ` +
        `set AI_EMBEDDING_DIMENSIONS to at most ${dimensions} or migrate the column`
    )
  }
  if (!embedding.every((value) => Number.isFinite(value))) {
    throw new RangeError('Embedding values must be finite numbers')
  }
  // Trailing zeros change neither dot products nor norms, so cosine similarity is preserved.
  const padding = new Array<number>(dimensions - embedding.length).fill(0)
  return `[${[...embedding, ...padding].join(',')}]`
}
