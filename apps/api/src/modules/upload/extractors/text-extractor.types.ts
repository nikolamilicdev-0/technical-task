/** Reads a file's text; rejects with `TextExtractionError` if the bytes are not that format. */
export type TextExtractor = (bytes: Uint8Array) => Promise<string>

/** How the client describes an upload (multer's field names); neither value is verified. */
export interface FileMetadata {
  readonly originalname: string
  readonly mimetype: string
}
