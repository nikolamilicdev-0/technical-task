import { type Document, DOCUMENT_CONTENT_MAX } from '@kb/contracts'
import { Injectable } from '@nestjs/common'

import { ApiHttpException } from '../../common/errors/api-http.exception.js'
import { DEFAULT_ERROR_MESSAGES } from '../../common/errors/error.constants.js'
import { containsNul } from '../../common/utils/text.js'
import type { UserContext } from '../../database/user-context.types.js'
import { DocumentsService } from '../documents/documents.service.js'
import { selectExtractor } from './extractors/select-extractor.js'
import { TextExtractionError } from './extractors/text-extraction.error.js'
import { UPLOAD_FILE_FIELD, UPLOAD_MESSAGES } from './upload.constants.js'
import { titleFromFilename } from './upload-title.js'
import type { UploadedDocumentFile, UploadFields } from './upload.types.js'

/** Turns an uploaded file into a document through the same create path as the editor. */
@Injectable()
export class UploadService {
  constructor(private readonly documents: DocumentsService) {}

  async upload(
    user: UserContext,
    file: UploadedDocumentFile | undefined,
    fields: UploadFields
  ): Promise<Document> {
    if (file === undefined) throw missingFile()
    const content = await readText(file)
    const title = fields.title ?? titleFromFilename(file.originalname)
    return this.documents.create(
      user,
      { title, content, tags: fields.tags },
      { type: 'upload', filename: file.originalname }
    )
  }
}

async function readText(file: UploadedDocumentFile): Promise<string> {
  const extract = selectExtractor(file)
  if (extract === undefined) {
    throw new ApiHttpException('unsupported_media_type', [UPLOAD_MESSAGES.unsupportedType])
  }
  const text = await extract(file.buffer).catch(toUnprocessable)
  if (text.trim() === '') throw unprocessable(UPLOAD_MESSAGES.noText)
  if (text.length > DOCUMENT_CONTENT_MAX) throw unprocessable(UPLOAD_MESSAGES.tooMuchText)
  // Broken PDF fonts can map glyphs to U+0000, which Postgres cannot store.
  if (containsNul(text)) throw unprocessable(UPLOAD_MESSAGES.nulInText)
  return text
}

function toUnprocessable(error: unknown): never {
  if (error instanceof TextExtractionError) throw unprocessable(error.message)
  throw error
}

function unprocessable(message: string): ApiHttpException {
  return new ApiHttpException('invalid_payload', [message])
}

function missingFile(): ApiHttpException {
  return new ApiHttpException('invalid_payload', [DEFAULT_ERROR_MESSAGES.invalid_payload], {
    errors: { [UPLOAD_FILE_FIELD]: [UPLOAD_MESSAGES.missingFile] },
  })
}
