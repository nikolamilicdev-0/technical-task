export const DOCUMENT_INGESTION_REQUESTED = 'document.ingestion.requested'

export interface DocumentIngestionRequested {
  readonly documentId: string
  readonly userId: string
}
