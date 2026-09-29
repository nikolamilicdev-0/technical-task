import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { extractPdfText } from '../../../../../src/modules/upload/extractors/pdf.extractor.js'
import { TextExtractionError } from '../../../../../src/modules/upload/extractors/text-extraction.error.js'

function fixture(name: string): Buffer {
  return readFileSync(new URL(`../../../../fixtures/${name}`, import.meta.url))
}

describe('extractPdfText', () => {
  it('reads the text of every page, one line break between pages', async () => {
    await expect(extractPdfText(fixture('two-pages.pdf'))).resolves.toBe(
      'Hello from page one\nSecond page text'
    )
  })

  it('returns no text for a PDF without a text layer', async () => {
    await expect(extractPdfText(fixture('no-text.pdf'))).resolves.toBe('')
  })

  it('leaves the uploaded buffer intact', async () => {
    const bytes = fixture('two-pages.pdf')
    const size = bytes.byteLength

    await extractPdfText(bytes)

    expect(bytes.byteLength).toBe(size)
  })

  it('rejects bytes that are not a PDF', async () => {
    const rejection = extractPdfText(Buffer.from('%PDF-1.7 but not really'))

    await expect(rejection).rejects.toThrow(TextExtractionError)
    await expect(rejection).rejects.toThrow('The PDF could not be read')
  })
})
