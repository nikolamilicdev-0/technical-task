/** The file cannot be read as the format it claims; the message is safe to show the uploader. */
export class TextExtractionError extends Error {
  override readonly name = 'TextExtractionError'
}
