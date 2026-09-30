import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  DOCUMENT_CONTENT_MAX,
  MAX_TAGS,
  MAX_UPLOAD_BYTES,
} from '@kb/contracts'

/** Multipart field that carries the file. */
export const UPLOAD_FILE_FIELD = 'file'

export const UPLOAD_RATE_LIMIT_PER_MINUTE = 10

// Room for any valid title or tag; busboy would otherwise buffer up to 1 MB per text field.
const UPLOAD_FIELD_MAX_BYTES = 4 * 1024

/** One file of at most MAX_UPLOAD_BYTES, plus a title and one text part per tag. */
export const UPLOAD_LIMITS = {
  fileSize: MAX_UPLOAD_BYTES,
  files: 1,
  fields: MAX_TAGS + 1,
  fieldSize: UPLOAD_FIELD_MAX_BYTES,
} as const

// Browsers send UTF-8 filenames without naming a charset; multer would decode them as latin1.
export const UPLOAD_FILENAME_CHARSET = 'utf8'

/** Title of an upload whose filename leaves nothing to use. */
export const UNTITLED_UPLOAD_TITLE = 'Untitled document'

const CONTENT_MAX_TEXT = DOCUMENT_CONTENT_MAX.toLocaleString('en-US')

export const UPLOAD_MESSAGES = {
  unsupportedType: `Only ${ACCEPTED_UPLOAD_EXTENSIONS.join(', ')} files are supported`,
  missingFile: 'A file is required',
  noText: 'The file contains no extractable text',
  tooMuchText: `The file contains more than ${CONTENT_MAX_TEXT} characters of text`,
  notUtf8Text: 'The file is not UTF-8 encoded text',
  unreadablePdf: 'The PDF could not be read; it may be damaged or password-protected',
  nulInText: 'The file text contains NUL (U+0000) characters, which cannot be stored',
  nulInFilename: 'The filename must not contain NUL (U+0000) characters',
} as const
