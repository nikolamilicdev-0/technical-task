import {
  apiRoutes,
  type CreateDocumentInput,
  type Document,
  type DocumentList,
  documentListSchema,
  documentSchema,
  type ReindexResult,
  reindexResultSchema,
  type UpdateDocumentInput,
} from '@kb/contracts'

import { getApiClient } from '@/core/api/browser-client'
import { UPLOAD_FILE_FIELD } from '@/features/documents/constants'
import type { DocumentsListParams, UploadRequestOptions } from '@/features/documents/types'

function toUploadForm(file: File): FormData {
  const formData = new FormData()
  formData.append(UPLOAD_FILE_FIELD, file)
  return formData
}

export const documentsService = {
  list: (query: DocumentsListParams, signal?: AbortSignal): Promise<DocumentList> =>
    getApiClient().request(apiRoutes.documents.collection, {
      query,
      schema: documentListSchema,
      signal,
    }),

  get: (id: string, signal?: AbortSignal): Promise<Document> =>
    getApiClient().request(apiRoutes.documents.item(id), { schema: documentSchema, signal }),

  create: (input: CreateDocumentInput): Promise<Document> =>
    getApiClient().request(apiRoutes.documents.collection, {
      method: 'POST',
      body: input,
      schema: documentSchema,
    }),

  update: (id: string, input: UpdateDocumentInput): Promise<Document> =>
    getApiClient().request(apiRoutes.documents.item(id), {
      method: 'PATCH',
      body: input,
      schema: documentSchema,
    }),

  remove: (id: string): Promise<void> =>
    getApiClient().request<void>(apiRoutes.documents.item(id), { method: 'DELETE' }),

  reindex: (id: string): Promise<ReindexResult> =>
    getApiClient().request(apiRoutes.documents.reindex(id), {
      method: 'POST',
      schema: reindexResultSchema,
    }),

  upload: (file: File, options: UploadRequestOptions = {}): Promise<Document> =>
    getApiClient().upload(apiRoutes.documents.upload, {
      formData: toUploadForm(file),
      schema: documentSchema,
      ...options,
    }),
}
