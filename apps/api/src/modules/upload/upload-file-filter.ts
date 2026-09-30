import { ApiHttpException } from '../../common/errors/api-http.exception.js'
import { DEFAULT_ERROR_MESSAGES } from '../../common/errors/error.constants.js'
import { containsNul } from '../../common/utils/text.js'
import { selectExtractor } from './extractors/select-extractor.js'
import type { FileMetadata } from './extractors/text-extractor.types.js'
import { UPLOAD_FILE_FIELD, UPLOAD_MESSAGES } from './upload.constants.js'

type AcceptFile = (error: Error | null, acceptFile: boolean) => void

// Runs before any of the file is buffered.
export function uploadFileFilter(_request: unknown, file: FileMetadata, accept: AcceptFile): void {
  if (containsNul(file.originalname)) {
    accept(invalidFilename(), false)
    return
  }
  if (selectExtractor(file) === undefined) {
    accept(new ApiHttpException('unsupported_media_type', [UPLOAD_MESSAGES.unsupportedType]), false)
    return
  }
  accept(null, true)
}

function invalidFilename(): ApiHttpException {
  return new ApiHttpException('invalid_payload', [DEFAULT_ERROR_MESSAGES.invalid_payload], {
    errors: { [UPLOAD_FILE_FIELD]: [UPLOAD_MESSAGES.nulInFilename] },
  })
}
