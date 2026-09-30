import { describe, expect, it } from 'vitest'

import { TokenCounter } from '../../../../../src/ai/token-counter.js'
import { sha256Hex } from '../../../../../src/common/utils/hash.js'
import {
  chunkDocument,
  normalizeMarkdown,
} from '../../../../../src/modules/ingestion/chunking/chunker.js'
import {
  CHUNK_MAX_TOKENS,
  CHUNK_MIN_TAIL_TOKENS,
  CHUNK_OVERLAP_TOKENS,
  CHUNK_TARGET_TOKENS,
  MAX_BLANK_RUN_LENGTH,
  MAX_BREADCRUMB_TOKENS,
  MAX_HEADING_LENGTH,
} from '../../../../../src/modules/ingestion/chunking/chunker.constants.js'
import type { DocumentChunk } from '../../../../../src/modules/ingestion/chunking/chunker.types.js'
import { buildHandbook, paragraph, sentence } from '../../../../fixtures/markdown.js'
import { LINEAR_TIME_BUDGET_MS, timed } from '../../../../fixtures/timing.js'

const counter = new TokenCounter()
const HEADING_LINE = /^ {0,3}#{1,6}\s/m
const SENTENCE_END = /(?<=\.)\s+/

const chunk = (content: string, title = 'Guide'): DocumentChunk[] =>
  chunkDocument({ title, content }, counter)
const blocks = (...parts: string[]): string => parts.join('\n\n')
const firstSentence = (text: string): string => text.split(SENTENCE_END)[0] ?? ''

describe('chunkDocument', () => {
  it.each([
    ['empty content', ''],
    ['blank content', ' \n\n\t \r\n '],
  ])('returns no chunks for %s', (_, content) => {
    expect(chunk(content)).toEqual([])
  })

  it('keeps a small document as one normalized chunk under the title', () => {
    const [only, ...others] = chunk('# Intro  \r\n\r\n\r\n\r\nShort body.\r\n', 'Guide')
    const content = '# Intro\n\nShort body.'

    expect(others).toEqual([])
    expect(only).toEqual({
      index: 0,
      content,
      headingPath: 'Guide',
      tokenCount: counter.count(content),
      embeddingInput: `Guide\n\n${content}`,
      contentHash: sha256Hex(`Guide\n\n${content}`),
    })
  })

  it('gives each section its breadcrumb and never lets a chunk span a heading', () => {
    const chunks = chunk(
      blocks(
        '# Handbook',
        paragraph(1, 5, 'preamble'),
        '## Setup',
        paragraph(100, 12, 'setup'),
        '### Linux',
        paragraph(200, 12, 'linux'),
        '## Usage',
        paragraph(300, 12, 'usage')
      ),
      'Handbook'
    )
    const topicsOf = (content: string): string[] =>
      ['preamble', 'setup', 'linux', 'usage'].filter((topic) => content.includes(` ${topic} `))

    expect(chunks.map((chunk) => chunk.headingPath)).toEqual([
      'Handbook',
      'Handbook › Setup',
      'Handbook › Setup › Linux',
      'Handbook › Usage',
    ])
    for (const { content } of chunks) {
      expect(content).not.toMatch(HEADING_LINE)
      expect(topicsOf(content)).toHaveLength(1)
    }
  })

  it('pops heading levels, so a later heading replaces its siblings and their children', () => {
    const chunks = chunk(
      blocks(
        '# A',
        paragraph(1, 10),
        '## B',
        paragraph(100, 10),
        '### C',
        paragraph(200, 10),
        '## D',
        paragraph(300, 10),
        '# E',
        paragraph(400, 10)
      ),
      'Doc'
    )

    expect(chunks.map((chunk) => chunk.headingPath)).toEqual([
      'Doc › A',
      'Doc › A › B',
      'Doc › A › B › C',
      'Doc › A › D',
      'Doc › E',
    ])
  })

  it('splits long prose into chunks within the budget that repeat whole trailing sentences', () => {
    const chunks = chunk(paragraph(1, 80))

    expect(chunks.length).toBeGreaterThanOrEqual(3)
    for (const { tokenCount } of chunks) expect(tokenCount).toBeLessThanOrEqual(CHUNK_TARGET_TOKENS)
    for (const [index, next] of chunks.slice(1).entries()) {
      const previous = chunks[index]?.content ?? ''
      const repeated = previous.slice(previous.indexOf(firstSentence(next.content)))

      expect(previous).toContain(firstSentence(next.content))
      expect(next.content.startsWith(repeated)).toBe(true)
      expect(counter.count(repeated)).toBeLessThanOrEqual(CHUNK_OVERLAP_TOKENS)
    }
  })

  it('keeps a fenced code block whole and its `#` comment out of the breadcrumbs', () => {
    const code = ['```sh', '# fake heading: install dependencies', 'pnpm install', '```'].join('\n')
    const chunks = chunk(
      blocks('## Build', paragraph(1, 20), code, paragraph(100, 20), '## Deploy', paragraph(200, 5))
    )
    const withCode = chunks.filter((chunk) => chunk.content.includes('# fake heading'))

    // A small block may also open the next chunk as overlap, but never in part.
    expect(withCode.length).toBeGreaterThan(0)
    for (const { content, headingPath } of withCode) {
      expect(content).toContain(code)
      expect(headingPath).toBe('Guide › Build')
    }
    expect(chunks.some((chunk) => chunk.headingPath.includes('fake heading'))).toBe(false)
  })

  it('keeps a paragraph larger than the target but within the maximum in one chunk', () => {
    const large = paragraph(1, 31)
    const chunks = chunk(blocks(large, paragraph(100, 30)))

    expect(counter.count(large)).toBeGreaterThan(CHUNK_TARGET_TOKENS)
    expect(counter.count(large)).toBeLessThanOrEqual(CHUNK_MAX_TOKENS)
    expect(chunks[0]?.content).toBe(large)
  })

  it('cuts a paragraph without break points into token windows without losing any text', () => {
    const run = Array.from({ length: 1_500 }, (_, index) => `word${index}`).join(' ')
    const chunks = chunk(run)
    const withoutSpaces = (text: string): string => text.replace(/\s+/g, '')

    expect(chunks.length).toBeGreaterThan(1)
    for (const { tokenCount } of chunks) expect(tokenCount).toBeLessThanOrEqual(CHUNK_MAX_TOKENS)
    expect(withoutSpaces(chunks.map((chunk) => chunk.content).join(''))).toBe(withoutSpaces(run))
  })

  it('folds a tiny last chunk of a section into the chunk before it', () => {
    const tail = sentence(999)
    const chunks = chunk(
      blocks('## Notes', paragraph(1, 13), paragraph(100, 13), tail, '## Other', paragraph(200, 20))
    )
    const notes = chunks.filter((chunk) => chunk.headingPath === 'Guide › Notes')

    expect(counter.count(tail)).toBeLessThan(CHUNK_MIN_TAIL_TOKENS)
    expect(notes).toHaveLength(1)
    expect(notes[0]?.content.endsWith(tail)).toBe(true)
  })

  it('changes only the chunks that contain an edited paragraph', () => {
    const edited = paragraph(210, 8, 'linux')
    const original = edited.replace('case 212', 'case 213')
    const document = (middle: string) =>
      blocks(
        '## Setup',
        paragraph(100, 20, 'setup'),
        '## Linux',
        paragraph(200, 8, 'linux'),
        middle,
        paragraph(220, 8, 'linux'),
        paragraph(230, 8, 'linux'),
        '## Usage',
        paragraph(300, 20, 'usage')
      )
    const before = chunk(document(original))
    const after = chunk(document(edited))
    const afterHashes = new Set(after.map((chunk) => chunk.contentHash))
    const beforeHashes = new Set(before.map((chunk) => chunk.contentHash))

    expect(counter.count(edited)).toBe(counter.count(original))
    const added = after.filter((chunk) => !beforeHashes.has(chunk.contentHash))
    const kept = before.filter((chunk) => !chunk.content.includes(original))
    expect(added.length).toBeGreaterThan(0)
    expect(added.every((chunk) => chunk.content.includes(edited))).toBe(true)
    expect(kept.every((chunk) => afterHashes.has(chunk.contentHash))).toBe(true)
    expect(kept.length).toBeGreaterThan(added.length)
  })

  it('chunks CRLF text exactly like LF text', () => {
    const text = buildHandbook()

    expect(chunk(text.replaceAll('\n', '\r\n'))).toEqual(chunk(text))
  })

  it('stores a passage repeated under the same headings once', () => {
    const answer = paragraph(1, 20)
    const chunks = chunk(blocks('## FAQ', answer, '## FAQ', answer, '## Other', paragraph(100, 10)))

    expect(chunks.filter((chunk) => chunk.content === answer)).toHaveLength(1)
    expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, index) => index))
  })

  it('does not repeat a top heading that matches the title in the breadcrumb', () => {
    const chunks = chunk(blocks('# Guide', paragraph(1, 20), '## Setup', paragraph(100, 20)))

    expect(chunks.map((chunk) => chunk.headingPath)).toEqual(['Guide', 'Guide › Setup'])
  })

  it('holds the invariants on a realistic handbook', () => {
    const chunks = chunk(buildHandbook(), 'Team handbook')

    expect(chunks.length).toBeGreaterThan(10)
    expect(new Set(chunks.map((chunk) => chunk.contentHash)).size).toBe(chunks.length)
    for (const [index, chunk] of chunks.entries()) {
      expect(chunk.index).toBe(index)
      expect(chunk.tokenCount).toBe(counter.count(chunk.content))
      expect(chunk.tokenCount).toBeLessThanOrEqual(CHUNK_MAX_TOKENS)
      expect(chunk.embeddingInput).toBe(`${chunk.headingPath}\n\n${chunk.content}`)
      expect(chunk.contentHash).toBe(sha256Hex(chunk.embeddingInput))
      expect(chunk.headingPath.startsWith('Team handbook')).toBe(true)
    }
  })
})

describe('chunkDocument on hostile input', () => {
  it('chunks a line holding 40,000 spaces in linear time and within the budget', () => {
    const content = `Intro${' '.repeat(40_000)}text. ${paragraph(1, 60)}`

    const { value: chunks, ms } = timed(() => chunk(content))

    expect(ms).toBeLessThan(LINEAR_TIME_BUDGET_MS)
    expect(chunks.length).toBeGreaterThan(1)
    for (const { tokenCount } of chunks) expect(tokenCount).toBeLessThanOrEqual(CHUNK_MAX_TOKENS)
  })

  it('keeps every chunk of a run of real U+FFFD characters within the maximum', () => {
    const options = { targetTokens: 40, maxTokens: 50, overlapTokens: 5, minTailTokens: 6 }
    const content = `x ${'\uFFFD'.repeat(600)} y`

    const chunks = chunkDocument({ title: 'Guide', content }, counter, options)

    expect(chunks.length).toBeGreaterThan(1)
    for (const { tokenCount } of chunks) expect(tokenCount).toBeLessThanOrEqual(options.maxTokens)
  })

  it('turns an outline of headings alone into one chunk per heading', () => {
    const headings = Array.from({ length: 300 }, (_, index) => `Heading ${index} about things`)

    const chunks = chunk(headings.map((heading) => `## ${heading}`).join('\n'))

    expect(chunks.map((chunk) => chunk.content)).toEqual(headings)
    expect(chunks[0]?.headingPath).toBe(`Guide › ${headings[0]}`)
  })

  it('cuts an overlong heading in the breadcrumb, ending it with an ellipsis', () => {
    const heading = Array.from({ length: 6_000 }, (_, index) => `word${index}`).join(' ')
    const cut = `${heading.slice(0, MAX_HEADING_LENGTH - 1).trimEnd()}…`

    const chunks = chunk(blocks(`# ${heading}`, paragraph(1, 60)))

    expect(chunks.length).toBeGreaterThan(1)
    for (const { headingPath } of chunks) expect(headingPath).toBe(`Guide › ${cut}`)
  })

  it('drops the outermost headings of a breadcrumb over its budget, keeping the title', () => {
    const headings = Array.from({ length: 6 }, (_, level) => sentence(level))
    const lines = headings.map((heading, level) => `${'#'.repeat(level + 1)} ${heading}`)

    const [first] = chunk(blocks(...lines, paragraph(1, 40)))
    const breadcrumb = first?.headingPath ?? ''

    expect(counter.count(breadcrumb)).toBeLessThanOrEqual(MAX_BREADCRUMB_TOKENS)
    expect(breadcrumb.startsWith('Guide › ')).toBe(true)
    expect(breadcrumb.endsWith(headings[5] ?? '')).toBe(true)
    expect(breadcrumb).not.toContain(headings[0])
  })
})

describe('normalizeMarkdown', () => {
  it('unifies line breaks, drops trailing spaces, keeps one blank line in a row and trims', () => {
    expect(normalizeMarkdown('\n  # Title  \r\n\r\n\r\n\rBody\t\n\n\n\n  indented\n\n')).toBe(
      '# Title\n\nBody\n\n  indented'
    )
  })

  it('cuts a run of 400,000 spaces inside a line in linear time', () => {
    const { value, ms } = timed(() => normalizeMarkdown(`a${' '.repeat(400_000)}b`))

    expect(value).toBe(`a${' '.repeat(MAX_BLANK_RUN_LENGTH)}b`)
    expect(ms).toBeLessThan(LINEAR_TIME_BUDGET_MS)
  })

  it('drops 400,000 trailing spaces in linear time', () => {
    const { value, ms } = timed(() => normalizeMarkdown(`a${' \t'.repeat(200_000)}\nb`))

    expect(value).toBe('a\nb')
    expect(ms).toBeLessThan(LINEAR_TIME_BUDGET_MS)
  })

  it('keeps indentation up to the cap', () => {
    const code = `\`\`\`py\n${' '.repeat(MAX_BLANK_RUN_LENGTH)}return value\n\`\`\``

    expect(normalizeMarkdown(code)).toBe(code)
  })
})
