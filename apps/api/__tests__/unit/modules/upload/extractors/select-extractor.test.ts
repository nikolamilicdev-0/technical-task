import { describe, expect, it } from 'vitest'

import { extractPdfText } from '../../../../../src/modules/upload/extractors/pdf.extractor.js'
import { extractPlainText } from '../../../../../src/modules/upload/extractors/plain-text.extractor.js'
import { selectExtractor } from '../../../../../src/modules/upload/extractors/select-extractor.js'

describe('selectExtractor', () => {
  it.each([
    ['text/plain', 'notes.txt'],
    ['text/markdown', 'README.md'],
    ['text/markdown; charset=UTF-8', 'README.md'],
    ['TEXT/PLAIN', 'notes'],
  ])('reads %s (%s) as plain text', (mimetype, originalname) => {
    expect(selectExtractor({ mimetype, originalname })).toBe(extractPlainText)
  })

  it('reads application/pdf as a PDF, whatever the name says', () => {
    expect(selectExtractor({ mimetype: 'application/pdf', originalname: 'scan.bin' })).toBe(
      extractPdfText
    )
  })

  it.each([
    ['application/octet-stream', 'notes.MD', extractPlainText],
    ['application/octet-stream', 'report.pdf', extractPdfText],
    ['', 'notes.txt', extractPlainText],
    ['text/x-markdown', 'draft.md', extractPlainText],
  ])(
    'falls back to the extension when %s is not an accepted type (%s)',
    (mimetype, name, extractor) => {
      expect(selectExtractor({ mimetype, originalname: name })).toBe(extractor)
    }
  )

  it.each([
    ['application/x-msdownload', 'setup.exe'],
    ['application/octet-stream', 'setup.exe'],
    ['image/png', 'photo.png'],
    ['application/octet-stream', 'archive.md.zip'],
    ['constructor', 'toString'],
  ])('rejects %s (%s)', (mimetype, originalname) => {
    expect(selectExtractor({ mimetype, originalname })).toBeUndefined()
  })
})
