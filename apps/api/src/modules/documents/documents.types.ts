import type { DocumentList, DocumentSummary } from '@kb/contracts'

import type { Tables, TablesInsert, TablesUpdate } from '../../database/database.types.js'

/** Where a document's text came from; an upload keeps the original filename. */
export type DocumentSource =
  { readonly type: 'editor' } | { readonly type: 'upload'; readonly filename: string }

/** One page of matching documents; the service echoes the requested window back. */
export type DocumentPage = Pick<DocumentList, 'items' | 'total'>

/** The summary fields the view computes from `content`. */
export type ContentPreview = Pick<DocumentSummary, 'contentPreview' | 'contentLength'>

/** A `documents` row as the API selects it: all but the owner, the hash and the claim time. */
export type DocumentRow = Omit<
  Tables<'documents'>,
  'user_id' | 'content_hash' | 'processing_started_at'
>

/** A `document_summaries` row; the generator types every view column as nullable. */
export type DocumentSummaryRow = Omit<Tables<'document_summaries'>, 'user_id'>

/** The columns `authenticated` may insert; the trigger fills the hash and the queue state. */
export type DocumentInsertRow = Pick<
  TablesInsert<'documents'>,
  'title' | 'content' | 'tags' | 'source_type' | 'source_filename'
>

/** The columns `authenticated` may update. */
export type DocumentUpdateRow = Pick<TablesUpdate<'documents'>, 'title' | 'content' | 'tags'>
