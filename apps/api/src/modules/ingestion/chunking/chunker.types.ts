export interface ChunkableDocument {
  readonly title: string
  readonly content: string
}

export interface ChunkingOptions {
  /** Packing stops adding units to a chunk that would grow past this size. */
  readonly targetTokens: number
  /** No chunk is larger; a block (paragraph, list, code block) up to this size is never split. */
  readonly maxTokens: number
  readonly overlapTokens: number
  /** A section's last chunk below this size joins the previous one when the result fits. */
  readonly minTailTokens: number
}

export interface DocumentChunk {
  readonly index: number
  readonly content: string
  readonly headingPath: string
  readonly tokenCount: number
  readonly embeddingInput: string
  /** SHA-256 of `embeddingInput`: re-indexing reuses the stored vector of an unchanged chunk. */
  readonly contentHash: string
}

export interface MarkdownHeading {
  readonly level: number
  readonly text: string
}

export interface MarkdownSection {
  readonly headingPath: readonly string[]
  readonly body: string
}

export type MarkdownBlockKind = 'prose' | 'code'

export interface MarkdownBlock {
  readonly kind: MarkdownBlockKind
  readonly text: string
}

export interface CodeFence {
  readonly marker: string
  readonly length: number
}

/** A piece of text and the whitespace in front of it, so joined pieces restore the original. */
export interface TextPiece {
  readonly text: string
  readonly separator: string
}

export interface ChunkUnit extends TextPiece {
  readonly tokens: number
  /** What the separator adds when the unit follows another; a space usually merges into a word. */
  readonly joinTokens: number
}

/** A chunk being packed: its units, of which the first `carried` repeat the previous chunk. */
export interface PackedChunk {
  readonly units: readonly ChunkUnit[]
  readonly carried: number
}

export interface ChunkDraft {
  readonly headingPath: string
  readonly content: string
}
