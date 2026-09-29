import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  ACCEPTED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from '@kb/contracts'

import type { UploadFileMetadata, UploadValidation } from '@/features/documents/types'

const ACCEPTED_TYPES: ReadonlySet<string> = new Set(ACCEPTED_UPLOAD_MIME_TYPES)
const ACCEPTED_EXTENSIONS: ReadonlySet<string> = new Set(ACCEPTED_UPLOAD_EXTENSIONS)
const MIME_PARAMETER_SEPARATOR = ';'
const EXTENSION_SEPARATOR = '.'

/**
 * The API's own checks, made before sending: an accepted MIME type or else extension (browsers
 * often report Markdown with an empty type), some content, and at most MAX_UPLOAD_BYTES.
 */
export function validateUpload(file: UploadFileMetadata): UploadValidation {
  if (!isAcceptedType(file)) return { ok: false, reason: 'unsupportedType' }
  if (file.size === 0) return { ok: false, reason: 'empty' }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: 'tooLarge' }
  return { ok: true }
}

function isAcceptedType({ name, type }: UploadFileMetadata): boolean {
  return ACCEPTED_TYPES.has(mimeEssence(type)) || ACCEPTED_EXTENSIONS.has(extensionOf(name))
}

// `Text/Plain; charset=utf-8` names the type `text/plain`.
function mimeEssence(type: string): string {
  const [essence] = type.split(MIME_PARAMETER_SEPARATOR)
  return essence.trim().toLowerCase()
}

// As in Node's `extname`, a leading dot starts a hidden file's name, not an extension.
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(EXTENSION_SEPARATOR)
  return dot > 0 ? name.slice(dot).toLowerCase() : ''
}
