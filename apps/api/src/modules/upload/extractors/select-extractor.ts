import { extname } from 'node:path'

import type { ACCEPTED_UPLOAD_EXTENSIONS, ACCEPTED_UPLOAD_MIME_TYPES } from '@kb/contracts'

import { extractPdfText } from './pdf.extractor.js'
import { extractPlainText } from './plain-text.extractor.js'
import type { FileMetadata, TextExtractor } from './text-extractor.types.js'

type AcceptedMimeType = (typeof ACCEPTED_UPLOAD_MIME_TYPES)[number]
type AcceptedExtension = (typeof ACCEPTED_UPLOAD_EXTENSIONS)[number]

// Keyed by the contracts lists: accepting a new type without an extractor fails to compile.
const EXTRACTOR_BY_MIME_TYPE: Readonly<Record<AcceptedMimeType, TextExtractor>> = {
  'text/plain': extractPlainText,
  'text/markdown': extractPlainText,
  'application/pdf': extractPdfText,
}
const EXTRACTOR_BY_EXTENSION: Readonly<Record<AcceptedExtension, TextExtractor>> = {
  '.txt': extractPlainText,
  '.md': extractPlainText,
  '.pdf': extractPdfText,
}
const byMimeType = new Map<string, TextExtractor>(Object.entries(EXTRACTOR_BY_MIME_TYPE))
const byExtension = new Map<string, TextExtractor>(Object.entries(EXTRACTOR_BY_EXTENSION))
const MIME_PARAMETER_SEPARATOR = ';'

// curl and some browsers send Markdown as `application/octet-stream`: the extension decides then.
export function selectExtractor({
  mimetype,
  originalname,
}: FileMetadata): TextExtractor | undefined {
  return (
    byMimeType.get(mimeEssence(mimetype)) ?? byExtension.get(extname(originalname).toLowerCase())
  )
}

function mimeEssence(mimetype: string): string {
  const [essence] = mimetype.split(MIME_PARAMETER_SEPARATOR)
  return essence.trim().toLowerCase()
}
