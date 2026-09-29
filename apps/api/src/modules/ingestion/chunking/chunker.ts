import type { TokenCounting } from '../../../ai/token-counter.types.js'
import { sha256Hex } from '../../../common/utils/hash.js'
import { splitBlocks, splitCodeLines } from './blocks.js'
import {
  BLOCK_SEPARATOR,
  DEFAULT_CHUNKING_OPTIONS,
  EMBEDDING_INPUT_SEPARATOR,
  HEADING_SEPARATOR,
} from './chunker.constants.js'
import type {
  ChunkableDocument,
  ChunkDraft,
  ChunkingOptions,
  ChunkUnit,
  DocumentChunk,
  MarkdownBlock,
  TextPiece,
} from './chunker.types.js'
import { splitMarkdownSections } from './markdown-sections.js'
import { packUnits, toChunkUnit } from './pack-units.js'
import { splitSentences } from './sentences.js'

const LINE_BREAK = /\r\n?/g
const TRAILING_WHITESPACE = /[ \t]+$/gm
const EXTRA_BLANK_LINES = /\n{3,}/g

/**
 * Splits a Markdown document into passages for embedding (DEC-006): a chunk never spans a heading,
 * fenced code stays whole when it fits, and each chunk carries a `Title › Heading` breadcrumb.
 */
export function chunkDocument(
  document: ChunkableDocument,
  counter: TokenCounting,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): DocumentChunk[] {
  const text = normalizeMarkdown(document.content)
  if (text === '') return []
  if (counter.count(text) <= options.maxTokens) {
    return buildChunks(document.title, [{ headingPath: [], content: text }], counter)
  }
  const drafts = splitMarkdownSections(text).flatMap(({ headingPath, body }) =>
    packUnits(sectionUnits(body, options, counter), options, counter).map(
      (content): ChunkDraft => ({ headingPath, content })
    )
  )
  return buildChunks(document.title, drafts, counter)
}

/** `\n` line breaks, no trailing spaces, at most one blank line in a row, no outer whitespace. */
export function normalizeMarkdown(content: string): string {
  return content
    .replace(LINE_BREAK, '\n')
    .replace(TRAILING_WHITESPACE, '')
    .replace(EXTRA_BLANK_LINES, '\n\n')
    .trim()
}

function sectionUnits(body: string, options: ChunkingOptions, counter: TokenCounting): ChunkUnit[] {
  return splitBlocks(body).flatMap((block) => blockUnits(block, options, counter))
}

// A block that fits stays whole; a larger one splits into code lines or sentences first.
function blockUnits(
  block: MarkdownBlock,
  options: ChunkingOptions,
  counter: TokenCounting
): ChunkUnit[] {
  const unit = toChunkUnit({ text: block.text, separator: BLOCK_SEPARATOR }, counter)
  if (unit.tokens <= options.maxTokens) return [unit]
  const pieces = block.kind === 'code' ? splitCodeLines(block.text) : splitSentences(block.text)
  return pieces.flatMap((piece, index) =>
    pieceUnits(index === 0 ? { ...piece, separator: BLOCK_SEPARATOR } : piece, options, counter)
  )
}

// Only a piece without any break point (a huge line or sentence) is cut into token windows.
function pieceUnits(
  piece: TextPiece,
  options: ChunkingOptions,
  counter: TokenCounting
): ChunkUnit[] {
  const unit = toChunkUnit(piece, counter)
  if (unit.tokens <= options.maxTokens) return [unit]
  const [first = '', ...rest] = counter.splitByTokens(piece.text, options.targetTokens)
  return [{ text: first, separator: piece.separator }, ...rest.map(toWindowPiece)].map((window) =>
    toChunkUnit(window, counter)
  )
}

// A window's leading whitespace moves into its separator, so no chunk starts with a space.
function toWindowPiece(window: string): TextPiece {
  const text = window.trimStart()
  return { text, separator: window.slice(0, window.length - text.length) }
}

function buildChunks(
  title: string,
  drafts: readonly ChunkDraft[],
  counter: TokenCounting
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const seen = new Set<string>()
  for (const draft of drafts) {
    // Only trailing whitespace goes: a leading indent belongs to the text, such as a code line.
    const content = draft.content.trimEnd()
    const headingPath = toBreadcrumb(title, draft.headingPath)
    const embeddingInput = `${headingPath}${EMBEDDING_INPUT_SEPARATOR}${content}`
    const contentHash = sha256Hex(embeddingInput)
    // Chunks are keyed by hash per document, so a repeated passage is stored once.
    if (content === '' || seen.has(contentHash)) continue
    seen.add(contentHash)
    const tokenCount = counter.count(content)
    chunks.push({
      index: chunks.length,
      content,
      headingPath,
      tokenCount,
      embeddingInput,
      contentHash,
    })
  }
  return chunks
}

// Adjacent repeats collapse, so an opening `# Handbook` in "Handbook" does not show up twice.
function toBreadcrumb(title: string, headings: readonly string[]): string {
  const segments: string[] = []
  for (const segment of [title.trim(), ...headings]) {
    const previous = segments.at(-1)
    if (segment === '' || segment.toLowerCase() === previous?.toLowerCase()) continue
    segments.push(segment)
  }
  return segments.join(HEADING_SEPARATOR)
}
