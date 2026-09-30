import type { z } from 'zod'

import type { FileMetadata } from './extractors/text-extractor.types.js'
import type { uploadFieldsSchema } from './upload.schema.js'

export interface UploadedDocumentFile extends FileMetadata {
  readonly buffer: Uint8Array
}

export type UploadFields = z.output<typeof uploadFieldsSchema>
