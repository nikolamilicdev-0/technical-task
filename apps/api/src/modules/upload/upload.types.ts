import type { z } from 'zod'

import type { FileMetadata } from './extractors/text-extractor.types.js'
import type { uploadFieldsSchema } from './upload.schema.js'

/** The parts of a multer upload the service reads; memory storage keeps the bytes in `buffer`. */
export interface UploadedDocumentFile extends FileMetadata {
  readonly buffer: Uint8Array
}

/** The parsed text parts: an optional title (else the filename) and tags. */
export type UploadFields = z.output<typeof uploadFieldsSchema>
