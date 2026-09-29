import { UPLOAD_MESSAGES } from '../upload.constants.js'
import { TextExtractionError } from './text-extraction.error.js'

// fatal: bytes that are not UTF-8 reject the file instead of turning into U+FFFD characters.
// The decoder also drops a leading byte-order mark (ignoreBOM defaults to false).
const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
const LINE_BREAKS = /\r\n?/g
// Postgres text cannot store U+0000, and it only turns up in binary files.
const NUL_CHARACTER = '\u0000'

/** The file as UTF-8 text with `\n` line endings; binary content is rejected. */
export async function extractPlainText(bytes: Uint8Array): Promise<string> {
  const text = decodeUtf8(bytes)
  if (text.includes(NUL_CHARACTER)) throw new TextExtractionError(UPLOAD_MESSAGES.notUtf8Text)
  return text.replace(LINE_BREAKS, '\n')
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return utf8Decoder.decode(bytes)
  } catch (error) {
    throw new TextExtractionError(UPLOAD_MESSAGES.notUtf8Text, { cause: error })
  }
}
