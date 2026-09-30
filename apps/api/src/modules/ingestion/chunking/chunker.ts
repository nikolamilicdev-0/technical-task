import type { TokenCounting } from '../../../ai/token-counter.types.js'
import { sha256Hex } from '../../../common/utils/hash.js'
import { countCodePoints, takeCodePoints } from '../../../common/utils/text.js'
import { splitBlocks, splitCodeLines } from './blocks.js'
import {
  BLOCK_SEPARATOR,
  DEFAULT_CHUNKING_OPTIONS,
  EMBEDDING_INPUT_SEPARATOR,
  HEADING_SEPARATOR,
  MAX_BLANK_RUN_LENGTH,
  MAX_BREADCRUMB_TOKENS,
  MAX_HEADING_LENGTH,
  TRUNCATION_MARK,
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
// Both match a run of spaces and tabs from its first character only, so a long run is scanned once.
const TRAILING_WHITESPACE = /(?<![ \t])[ \t]+$/gm
const LONG_BLANK_RUN = new RegExp(`(?<![ \\t])[ \\t]{${MAX_BLANK_RUN_LENGTH + 1},}`, 'g')
const EXTRA_BLANK_LINES = /\n{3,}/g

export function chunkDocument(
  document: ChunkableDocument,
  counter: TokenCounting,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): DocumentChunk[] {
  const text = normalizeMarkdown(document.content)
  if (text === '') return []
  if (counter.count(text) <= options.maxTokens) {
    const headingPath = toBreadcrumb(document.title, [], counter)
    return buildChunks([{ headingPath, content: text }], counter)
  }
  const drafts = splitMarkdownSections(text).flatMap(({ headingPath, body }) => {
    const breadcrumb = toBreadcrumb(document.title, headingPath, counter)
    return packUnits(sectionUnits(body, options, counter), options, counter).map(
      (content): ChunkDraft => ({ headingPath: breadcrumb, content })
    )
  })
  return buildChunks(drafts, counter)
}

export function normalizeMarkdown(content: string): string {
  return content
    .replace(LINE_BREAK, '\n')
    .replace(TRAILING_WHITESPACE, '')
    .replace(LONG_BLANK_RUN, (run) => run.slice(0, MAX_BLANK_RUN_LENGTH))
    .replace(EXTRA_BLANK_LINES, '\n\n')
    .trim()
}

function sectionUnits(body: string, options: ChunkingOptions, counter: TokenCounting): ChunkUnit[] {
  return splitBlocks(body).flatMap((block) => blockUnits(block, options, counter))
}

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

// Only a piece without any break point (a huge line or sentence) is cut into token windows; a
// window that still counts more than the maximum on its own is cut again with half the budget.
function pieceUnits(
  piece: TextPiece,
  options: ChunkingOptions,
  counter: TokenCounting,
  budget = options.targetTokens
): ChunkUnit[] {
  const unit = toChunkUnit(piece, counter)
  if (unit.tokens <= options.maxTokens || budget < 1) return [unit]
  const [first = '', ...rest] = counter.splitByTokens(piece.text, budget)
  const windows = [{ text: first, separator: piece.separator }, ...rest.map(toWindowPiece)]
  return windows.flatMap((window) => pieceUnits(window, options, counter, Math.floor(budget / 2)))
}

function toWindowPiece(window: string): TextPiece {
  const text = window.trimStart()
  return { text, separator: window.slice(0, window.length - text.length) }
}

function buildChunks(drafts: readonly ChunkDraft[], counter: TokenCounting): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const seen = new Set<string>()
  for (const { headingPath, content: draft } of drafts) {
    // Only trailing whitespace goes: a leading indent belongs to the text, such as a code line.
    const content = draft.trimEnd()
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

// Adjacent repeats collapse, so an opening `# Handbook` in "Handbook" does not show up twice; over
// the token budget, the outermost headings give way before the title and the innermost ones.
function toBreadcrumb(title: string, headings: readonly string[], counter: TokenCounting): string {
  const segments: string[] = []
  for (const segment of [title.trim(), ...headings.map(capHeading)]) {
    const previous = segments.at(-1)
    if (segment === '' || segment.toLowerCase() === previous?.toLowerCase()) continue
    segments.push(segment)
  }
  while (segments.length > 1 && exceedsBreadcrumbBudget(segments, counter)) segments.splice(1, 1)
  return segments.join(HEADING_SEPARATOR)
}

function exceedsBreadcrumbBudget(segments: readonly string[], counter: TokenCounting): boolean {
  return counter.count(segments.join(HEADING_SEPARATOR)) > MAX_BREADCRUMB_TOKENS
}

function capHeading(heading: string): string {
  if (countCodePoints(heading) <= MAX_HEADING_LENGTH) return heading
  return `${takeCodePoints(heading, MAX_HEADING_LENGTH - 1).trimEnd()}${TRUNCATION_MARK}`
}
