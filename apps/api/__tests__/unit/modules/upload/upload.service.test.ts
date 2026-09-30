import { readFileSync } from 'node:fs'

import { DOCUMENT_CONTENT_MAX } from '@kb/contracts'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import type { DatabaseClient } from '../../../../src/database/database-client.types.js'
import type { UserContext } from '../../../../src/database/user-context.types.js'
import { DocumentsService } from '../../../../src/modules/documents/documents.service.js'
import { UploadService } from '../../../../src/modules/upload/upload.service.js'
import type { UploadedDocumentFile } from '../../../../src/modules/upload/upload.types.js'
import { TEST_USER } from '../../../fixtures.js'
import { buildDocument } from '../../../fixtures/documents.js'

const USER: UserContext = { userId: TEST_USER.id, db: {} as DatabaseClient }
const NO_FIELDS = { tags: [] }

let service: UploadService
const create = vi.fn<DocumentsService['create']>()

beforeEach(async () => {
  create.mockReset().mockImplementation((_user, input, source) =>
    Promise.resolve(
      buildDocument({
        ...input,
        sourceType: source?.type ?? 'editor',
        sourceFilename: source?.type === 'upload' ? source.filename : null,
      })
    )
  )
  const moduleRef = await Test.createTestingModule({
    providers: [UploadService, { provide: DocumentsService, useValue: { create } }],
  }).compile()
  service = moduleRef.get(UploadService)
})

function textFile(originalname: string, text: string | Uint8Array): UploadedDocumentFile {
  const buffer = typeof text === 'string' ? Buffer.from(text, 'utf8') : text
  return { originalname, mimetype: 'text/plain', buffer }
}

function pdfFile(fixture: string): UploadedDocumentFile {
  const buffer = readFileSync(new URL(`../../../fixtures/${fixture}`, import.meta.url))
  return { originalname: fixture, mimetype: 'application/pdf', buffer }
}

async function rejectionOf(promise: Promise<unknown>): Promise<ApiHttpException> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason
  )
  if (error instanceof ApiHttpException) return error
  throw new Error(`Expected an ApiHttpException, got ${String(error)}`)
}

describe('UploadService', () => {
  it('creates a document from the text, titled after the file, as an upload', async () => {
    const document = await service.upload(USER, textFile('Release notes.md', '# Shipped'), {
      tags: ['release'],
    })

    expect(create).toHaveBeenCalledWith(
      USER,
      { title: 'Release notes', content: '# Shipped', tags: ['release'] },
      { type: 'upload', filename: 'Release notes.md' }
    )
    expect(document).toMatchObject({ sourceType: 'upload', sourceFilename: 'Release notes.md' })
  })

  it('prefers the title the form sends', async () => {
    await service.upload(USER, textFile('draft-3.txt', 'Body'), { title: 'Final', tags: [] })

    expect(create.mock.lastCall?.[1].title).toBe('Final')
  })

  it('reads PDFs through the PDF extractor', async () => {
    await service.upload(USER, pdfFile('two-pages.pdf'), NO_FIELDS)

    expect(create.mock.lastCall?.[1]).toMatchObject({
      title: 'two-pages',
      content: 'Hello from page one\nSecond page text',
    })
  })

  it('answers 422 with a field error when no file was sent', async () => {
    const error = await rejectionOf(service.upload(USER, undefined, NO_FIELDS))

    expect(error.getStatus()).toBe(422)
    expect(error.body).toEqual({
      code: 'invalid_payload',
      messages: ['Invalid request payload'],
      errors: { file: ['A file is required'] },
    })
  })

  it.each([
    ['a whitespace-only text file', textFile('empty.txt', ' \n\t\n')],
    ['a PDF without a text layer', pdfFile('no-text.pdf')],
  ])('answers 422 "no extractable text" for %s', async (_, file) => {
    const error = await rejectionOf(service.upload(USER, file, NO_FIELDS))

    expect(error.body).toEqual({
      code: 'invalid_payload',
      messages: ['The file contains no extractable text'],
    })
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    [
      'text that is not UTF-8',
      textFile('latin1.txt', Uint8Array.from([0x63, 0x61, 0x66, 0xe9])),
      'The file is not UTF-8 encoded text',
    ],
    [
      'a damaged PDF',
      { originalname: 'broken.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-') },
      'The PDF could not be read; it may be damaged or password-protected',
    ],
    [
      'more text than a document may hold',
      textFile('huge.txt', 'x'.repeat(DOCUMENT_CONTENT_MAX + 1)),
      'The file contains more than 500,000 characters of text',
    ],
    [
      'a PDF whose font maps a glyph to NUL',
      pdfFile('nul-text.pdf'),
      'The file text contains NUL (U+0000) characters, which cannot be stored',
    ],
  ])('answers 422 for %s', async (_, file, message) => {
    const error = await rejectionOf(service.upload(USER, file, NO_FIELDS))

    expect(error.body).toEqual({ code: 'invalid_payload', messages: [message] })
  })

  it('answers 415 for a type it cannot extract, even past the multer filter', async () => {
    const file = { originalname: 'photo.png', mimetype: 'image/png', buffer: Buffer.from('png') }

    const error = await rejectionOf(service.upload(USER, file, NO_FIELDS))

    expect(error.getStatus()).toBe(415)
    expect(error.body.code).toBe('unsupported_media_type')
  })
})
