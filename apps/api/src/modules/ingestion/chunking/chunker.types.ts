/** What the chunker reads from a document. */
export interface ChunkableDocument {
  readonly title: string
  readonly content: string
}

/** Token budgets of one chunking run; `DEFAULT_CHUNKING_OPTIONS` holds the production values. */
export interface ChunkingOptions {
  /** Packing stops adding units to a chunk that would grow past this size. */
  readonly targetTokens: number
  /** No chunk is larger; a block (paragraph, list, code block) up to this size is never split. */
  readonly maxTokens: number
  /** Up to this many tokens of a chunk's trailing units open the next chunk again. */
  readonly overlapTokens: number
  /** A section's last chunk below this size joins the previous one when the result fits. */
  readonly minTailTokens: number
}

/** One retrievable passage of a document. */
export interface DocumentChunk {
  /** Position in the document, from 0. */
  readonly index: number
  readonly content: string
  /** The title and the headings above the passage: `Title › Setup › Linux`. */
  readonly headingPath: string
  /** cl100k tokens of `content`. */
  readonly tokenCount: number
  /** What gets embedded: the breadcrumb, a blank line, then the content. */
  readonly embeddingInput: string
  /** SHA-256 of `embeddingInput`: re-indexing reuses the stored vector of an unchanged chunk. */
  readonly contentHash: string
}

/** An ATX heading: its level (1 for `#`) and its text without the `#` runs. */
export interface MarkdownHeading {
  readonly level: number
  readonly text: string
}

/** The text below one heading, up to the next heading of any level. */
export interface MarkdownSection {
  /** Heading texts from the outermost level down; empty before the first heading. */
  readonly headingPath: readonly string[]
  readonly body: string
}

export type MarkdownBlockKind = 'prose' | 'code'

/** A run of lines between blank lines, or one fenced code block including its blank lines. */
export interface MarkdownBlock {
  readonly kind: MarkdownBlockKind
  readonly text: string
}

/** An opening code fence: a run of three or more backticks or tildes. */
export interface CodeFence {
  readonly marker: string
  readonly length: number
}

/** A piece of text and the whitespace in front of it, so joined pieces restore the original. */
export interface TextPiece {
  readonly text: string
  readonly separator: string
}

/** The smallest text the packer places whole: a block, a sentence, a code line or a token window. */
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

/** A chunk's text and breadcrumb, before the embedding input and the hash are derived. */
export interface ChunkDraft {
  readonly headingPath: string
  readonly content: string
}
