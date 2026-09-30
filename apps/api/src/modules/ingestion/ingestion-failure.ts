import { AiProviderError } from '@kb/ai'

import { VectorDimensionError } from '../../common/utils/vector.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import { INGESTION_MESSAGES } from './ingestion.constants.js'
import type { IngestionFailure } from './ingestion.types.js'

// Only `embedding` can be null in upsert_document_chunks: a vector meant for reuse vanished
// mid-run (a concurrent finalize), which the next attempt, reading stored hashes afresh, avoids.
const NOT_NULL_VIOLATION = '23502'

/**
 * Provider errors keep their message and retry when transient; database errors retry when transient
 * or on a vanished vector; an embedding the column cannot hold fails for good; the rest is a bug.
 */
export function classifyIngestionFailure(error: unknown): IngestionFailure {
  if (error instanceof AiProviderError) {
    const { retryAfterSeconds } = error.details
    return { message: error.message, retryable: error.retryable, retryAfterSeconds, expected: true }
  }
  if (error instanceof DatabaseRequestError) return classifyDatabaseFailure(error)
  if (error instanceof VectorDimensionError) {
    return { message: error.message, retryable: false, expected: true }
  }
  return { message: INGESTION_MESSAGES.unexpected, retryable: false, expected: false }
}

function classifyDatabaseFailure(error: DatabaseRequestError): IngestionFailure {
  if (error.transient) {
    return { message: INGESTION_MESSAGES.databaseUnavailable, retryable: true, expected: true }
  }
  if (error.code === NOT_NULL_VIOLATION) {
    return { message: INGESTION_MESSAGES.storedChunksChanged, retryable: true, expected: true }
  }
  return { message: INGESTION_MESSAGES.databaseRejected, retryable: false, expected: true }
}
