import { ApiHttpException } from '../../common/errors/api-http.exception.js'
import { selectExtractor } from './extractors/select-extractor.js'
import type { FileMetadata } from './extractors/text-extractor.types.js'
import { UPLOAD_MESSAGES } from './upload.constants.js'

type AcceptFile = (error: Error | null, acceptFile: boolean) => void

/** Multer `fileFilter`: refuses unsupported types with 415 before any of the file is buffered. */
export function uploadFileFilter(_request: unknown, file: FileMetadata, accept: AcceptFile): void {
  if (selectExtractor(file) === undefined) {
    accept(new ApiHttpException('unsupported_media_type', [UPLOAD_MESSAGES.unsupportedType]), false)
    return
  }
  accept(null, true)
}
