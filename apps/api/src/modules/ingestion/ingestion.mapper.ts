import type { DocumentChunk } from './chunking/chunker.types.js'
import type {
  ChunkPayload,
  ChunkUpsert,
  ClaimedDocument,
  ClaimedDocumentRow,
} from './ingestion.types.js'

export function toClaimedDocument(row: ClaimedDocumentRow): ClaimedDocument {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    contentHash: row.content_hash,
    attempt: row.ingestion_attempts,
  }
}

export function toChunkUpsert(chunk: DocumentChunk, embedding: string | null): ChunkUpsert {
  const { embeddingInput: _embeddingInput, ...stored } = chunk
  return { ...stored, embedding }
}

export function toChunkPayload(chunk: ChunkUpsert): ChunkPayload {
  return {
    chunk_index: chunk.index,
    content: chunk.content,
    heading_path: chunk.headingPath,
    token_count: chunk.tokenCount,
    content_hash: chunk.contentHash,
    embedding: chunk.embedding,
  }
}
