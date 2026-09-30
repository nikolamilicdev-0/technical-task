export interface ReadinessFacts {
  /** Declared size of `document_chunks.embedding`; undefined when the database did not answer. */
  readonly columnDimensions: number | undefined
  readonly aiConfigured: boolean
}
