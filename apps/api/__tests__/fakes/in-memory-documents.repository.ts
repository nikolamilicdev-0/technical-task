import { randomUUID } from 'node:crypto'

import type {
  CreateDocumentInput,
  Document,
  ListDocumentsQuery,
  UpdateDocumentInput,
} from '@kb/contracts'

import type { DatabaseClient } from '../../src/database/database-client.types.js'
import type { DocumentsRepository } from '../../src/modules/documents/documents.repository.js'
import type { DocumentPage, DocumentSource } from '../../src/modules/documents/documents.types.js'
import { buildDocument } from '../fixtures/documents.js'

type DocumentsStore = Pick<DocumentsRepository, keyof DocumentsRepository>

/** Keeps documents in a map and ignores the client; list filters are tested on the real one. */
export class InMemoryDocumentsRepository implements DocumentsStore {
  readonly #documents = new Map<string, Document>()

  async list(_db: DatabaseClient, { limit, offset }: ListDocumentsQuery): Promise<DocumentPage> {
    const items = [...this.#documents.values()].map(({ content: _content, ...summary }) => summary)
    return { items: items.slice(offset, offset + limit), total: items.length }
  }

  async findById(_db: DatabaseClient, id: string): Promise<Document | null> {
    return this.#documents.get(id) ?? null
  }

  async insert(
    _db: DatabaseClient,
    input: CreateDocumentInput,
    source: DocumentSource
  ): Promise<Document> {
    const document = buildDocument({
      ...input,
      id: randomUUID(),
      contentPreview: input.content,
      contentLength: input.content.length,
      sourceType: source.type,
      sourceFilename: source.type === 'upload' ? source.filename : null,
    })
    this.#documents.set(document.id, document)
    return document
  }

  async update(
    _db: DatabaseClient,
    id: string,
    input: UpdateDocumentInput
  ): Promise<Document | null> {
    const current = this.#documents.get(id)
    if (current === undefined) return null
    const updated: Document = {
      ...current,
      title: input.title ?? current.title,
      content: input.content ?? current.content,
      tags: input.tags ?? current.tags,
      updatedAt: new Date().toISOString(),
    }
    this.#documents.set(id, updated)
    return updated
  }

  async delete(_db: DatabaseClient, id: string): Promise<boolean> {
    return this.#documents.delete(id)
  }
}
