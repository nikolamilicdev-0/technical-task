/** Emitted when a document's text is new or changed, so ingestion starts before the next sweep. */
export const DOCUMENT_INGESTION_REQUESTED = 'document.ingestion.requested'

/** Payload of `DOCUMENT_INGESTION_REQUESTED`. */
export interface DocumentIngestionRequested {
  readonly documentId: string
  readonly userId: string
}
