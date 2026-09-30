import type {
  CreateDocumentInput,
  Document,
  ListDocumentsQuery,
  UpdateDocumentInput,
} from '@kb/contracts'
import { Injectable } from '@nestjs/common'

import type { DatabaseClient } from '../../database/database-client.types.js'
import { DATABASE_RELATIONS, POSTGREST_ERROR_CODES } from '../../database/database.constants.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import { exactCount } from '../../database/exact-count.js'
import type { TablesInsert } from '../../database/database.types.js'
import { toArrayLiteral, toContainsPattern } from '../../database/postgrest-filters.js'
import { DOCUMENT_COLUMNS, DOCUMENT_SUMMARY_COLUMNS } from './documents.constants.js'
import {
  toDocument,
  toDocumentInsert,
  toDocumentSummary,
  toDocumentUpdate,
} from './documents.mapper.js'
import type { DocumentPage, DocumentSource } from './documents.types.js'

type Filters = Pick<ListDocumentsQuery, 'search' | 'tag' | 'status'>

@Injectable()
export class DocumentsRepository {
  async list(db: DatabaseClient, query: ListDocumentsQuery): Promise<DocumentPage> {
    const { limit, offset } = query
    const { data, error, count, status } = await this.#summaries(db, query)
      .order('updated_at', { ascending: false })
      // Rows updated in one transaction tie on updated_at; the id keeps pages from overlapping.
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1)
    if (error?.code === POSTGREST_ERROR_CODES.rangeNotSatisfiable) {
      return { items: [], total: await this.#count(db, query) }
    }
    if (error) throw new DatabaseRequestError(error, status)
    return { items: data.map(toDocumentSummary), total: exactCount(count) }
  }

  async findById(db: DatabaseClient, id: string): Promise<Document | null> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.documents)
      .select(DOCUMENT_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new DatabaseRequestError(error, status)
    return data === null ? null : toDocument(data)
  }

  async insert(
    db: DatabaseClient,
    input: CreateDocumentInput,
    source: DocumentSource
  ): Promise<Document> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.documents)
      // The generated Insert type demands content_hash, which only the documents trigger writes.
      .insert(toDocumentInsert(input, source) as TablesInsert<'documents'>)
      .select(DOCUMENT_COLUMNS)
      .single()
    if (error) throw new DatabaseRequestError(error, status)
    return toDocument(data)
  }

  async update(
    db: DatabaseClient,
    id: string,
    input: UpdateDocumentInput
  ): Promise<Document | null> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.documents)
      .update(toDocumentUpdate(input))
      .eq('id', id)
      .select(DOCUMENT_COLUMNS)
      .maybeSingle()
    if (error) throw new DatabaseRequestError(error, status)
    return data === null ? null : toDocument(data)
  }

  async delete(db: DatabaseClient, id: string): Promise<boolean> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.documents)
      .delete()
      .eq('id', id)
      .select('id')
    if (error) throw new DatabaseRequestError(error, status)
    return data.length > 0
  }

  async #count(db: DatabaseClient, filters: Filters): Promise<number> {
    const { error, count, status } = await this.#summaries(db, filters, { head: true })
    if (error) throw new DatabaseRequestError(error, status)
    return exactCount(count)
  }

  #summaries(db: DatabaseClient, { search, tag, status }: Filters, { head = false } = {}) {
    let request = db
      .from(DATABASE_RELATIONS.documentSummaries)
      .select(DOCUMENT_SUMMARY_COLUMNS, { count: 'exact', head })
    if (search !== undefined) request = request.ilike('title', toContainsPattern(search))
    if (tag !== undefined) request = request.contains('tags', toArrayLiteral([tag]))
    if (status !== undefined) request = request.eq('embedding_status', status)
    return request
  }
}
