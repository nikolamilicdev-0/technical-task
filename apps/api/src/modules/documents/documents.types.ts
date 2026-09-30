import type { DocumentList, DocumentSummary } from '@kb/contracts'

import type { Tables, TablesInsert, TablesUpdate } from '../../database/database.types.js'

export type DocumentSource =
  { readonly type: 'editor' } | { readonly type: 'upload'; readonly filename: string }

export type DocumentPage = Pick<DocumentList, 'items' | 'total'>

export type ContentPreview = Pick<DocumentSummary, 'contentPreview' | 'contentLength'>

export type DocumentRow = Omit<
  Tables<'documents'>,
  'user_id' | 'content_hash' | 'processing_started_at'
>

export type DocumentSummaryRow = Omit<Tables<'document_summaries'>, 'user_id'>

/** The columns `authenticated` may insert; the trigger fills the hash and the queue state. */
export type DocumentInsertRow = Pick<
  TablesInsert<'documents'>,
  'title' | 'content' | 'tags' | 'source_type' | 'source_filename'
>

/** The columns `authenticated` may update. */
export type DocumentUpdateRow = Pick<TablesUpdate<'documents'>, 'title' | 'content' | 'tags'>
