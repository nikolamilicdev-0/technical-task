import { apiRoutes } from '@kb/contracts'

import { DOCUMENT_ID_PARAM } from '../documents/documents.constants.js'
import { MAX_CHUNKS_PER_DOCUMENT } from './chunking/chunker.constants.js'

/** Name of the sweep interval in the SchedulerRegistry. */
export const INGESTION_SWEEP_INTERVAL = 'ingestion-sweep'

/** Rows per `upsert_document_chunks` call; each stored vector is about 30 kB of JSON text. */
export const CHUNK_UPSERT_BATCH_SIZE = 50

/** Automatic retries wait 30 s, doubling with every attempt, but never more than 30 minutes. */
export const RETRY_BASE_DELAY_SECONDS = 30
export const RETRY_MAX_DELAY_SECONDS = 1_800

/** `upsert_document_chunks` and `finalize_document_ingestion` return it once the content changed. */
export const STALE_CONTENT_RESULT = -1

export const REINDEX_RATE_LIMIT_PER_MINUTE = 3
export const REINDEX_DOCUMENT_ROUTE = `${apiRoutes.documents.collection}/:${DOCUMENT_ID_PARAM}/reindex`

/** `documents.embedding_error` texts for failures that carry no message of their own. */
export const INGESTION_MESSAGES = {
  tooManyChunks: (chunkCount: number) =>
    `The document splits into ${chunkCount} chunks; at most ${MAX_CHUNKS_PER_DOCUMENT} can be indexed`,
  databaseUnavailable: 'The database could not be reached while indexing',
  storedChunksChanged: 'Stored chunks of this document changed while it was indexed',
  databaseRejected: 'The database rejected the chunks of this document',
  unexpected: 'Indexing failed unexpectedly; the API logs have the details',
} as const
