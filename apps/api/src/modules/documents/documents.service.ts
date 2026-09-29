import type {
  CreateDocumentInput,
  Document,
  DocumentList,
  ListDocumentsQuery,
  UpdateDocumentInput,
} from '@kb/contracts'
import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { ApiHttpException } from '../../common/errors/api-http.exception.js'
import type { UserContext } from '../../database/user-context.types.js'
import {
  DOCUMENT_INGESTION_REQUESTED,
  type DocumentIngestionRequested,
} from '../ingestion/ingestion.events.js'
import { DOCUMENT_NOT_FOUND_MESSAGE, EDITOR_SOURCE } from './documents.constants.js'
import { DocumentsRepository } from './documents.repository.js'
import type { DocumentSource } from './documents.types.js'

/** Document CRUD for the caller; RLS turns other users' documents into 404s. */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly repository: DocumentsRepository,
    private readonly events: EventEmitter2
  ) {}

  async list(user: UserContext, query: ListDocumentsQuery): Promise<DocumentList> {
    const page = await this.repository.list(user.db, query)
    return { ...page, limit: query.limit, offset: query.offset }
  }

  async get(user: UserContext, id: string): Promise<Document> {
    return found(await this.repository.findById(user.db, id))
  }

  async create(
    user: UserContext,
    input: CreateDocumentInput,
    source: DocumentSource = EDITOR_SOURCE
  ): Promise<Document> {
    const document = await this.repository.insert(user.db, input, source)
    this.#requestIngestion(user, document.id)
    return document
  }

  async update(user: UserContext, id: string, input: UpdateDocumentInput): Promise<Document> {
    const document = found(await this.repository.update(user.db, id, input))
    if (changesIndexedText(input)) this.#requestIngestion(user, document.id)
    return document
  }

  async remove(user: UserContext, id: string): Promise<void> {
    const deleted = await this.repository.delete(user.db, id)
    if (!deleted) throw documentNotFound()
  }

  #requestIngestion(user: UserContext, documentId: string): void {
    const event: DocumentIngestionRequested = { documentId, userId: user.userId }
    this.events.emit(DOCUMENT_INGESTION_REQUESTED, event)
  }
}

// Only title and content are embedded; the documents trigger re-queues when their hash changes.
function changesIndexedText({ title, content }: UpdateDocumentInput): boolean {
  return title !== undefined || content !== undefined
}

function found(document: Document | null): Document {
  if (document === null) throw documentNotFound()
  return document
}

function documentNotFound(): ApiHttpException {
  return new ApiHttpException('not_found', [DOCUMENT_NOT_FOUND_MESSAGE])
}
