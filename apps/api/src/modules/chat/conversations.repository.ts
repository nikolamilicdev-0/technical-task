import type {
  Conversation,
  CreateConversationInput,
  PaginationQuery,
  UpdateConversationInput,
} from '@kb/contracts'
import { Injectable } from '@nestjs/common'

import type { DatabaseClient } from '../../database/database-client.types.js'
import { DATABASE_RELATIONS, POSTGREST_ERROR_CODES } from '../../database/database.constants.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import { exactCount } from '../../database/exact-count.js'
import { CONVERSATION_COLUMNS } from './chat.constants.js'
import type { ConversationPage } from './chat.types.js'
import { toConversation } from './conversations.mapper.js'

/** Conversations through the caller's client: RLS limits every query to their own (DEC-004). */
@Injectable()
export class ConversationsRepository {
  /** Most recently active first (a new message bumps `updated_at`), with the total count. */
  async list(db: DatabaseClient, { limit, offset }: PaginationQuery): Promise<ConversationPage> {
    const { data, error, count, status } = await db
      .from(DATABASE_RELATIONS.conversations)
      .select(CONVERSATION_COLUMNS, { count: 'exact' })
      .order('updated_at', { ascending: false })
      // Rows updated in one transaction tie on updated_at; the id keeps pages from overlapping.
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1)
    // PostgREST answers an offset past the last row with 416 rather than an empty page.
    if (error?.code === POSTGREST_ERROR_CODES.rangeNotSatisfiable) {
      return { items: [], total: await this.#count(db) }
    }
    if (error) throw new DatabaseRequestError(error, status)
    return { items: data.map(toConversation), total: exactCount(count) }
  }

  async findById(db: DatabaseClient, id: string): Promise<Conversation | null> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.conversations)
      .select(CONVERSATION_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new DatabaseRequestError(error, status)
    return data === null ? null : toConversation(data)
  }

  async insert(db: DatabaseClient, { title }: CreateConversationInput): Promise<Conversation> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.conversations)
      .insert({ title: title ?? null })
      .select(CONVERSATION_COLUMNS)
      .single()
    if (error) throw new DatabaseRequestError(error, status)
    return toConversation(data)
  }

  /** Null when the caller has no such conversation. */
  async update(
    db: DatabaseClient,
    id: string,
    { title }: UpdateConversationInput
  ): Promise<Conversation | null> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.conversations)
      .update({ title })
      .eq('id', id)
      .select(CONVERSATION_COLUMNS)
      .maybeSingle()
    if (error) throw new DatabaseRequestError(error, status)
    return data === null ? null : toConversation(data)
  }

  /** Names an untitled conversation; null when it already has a title (or is not visible). */
  async setTitleIfUntitled(
    db: DatabaseClient,
    id: string,
    title: string
  ): Promise<Conversation | null> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.conversations)
      .update({ title })
      .eq('id', id)
      .is('title', null)
      .select(CONVERSATION_COLUMNS)
      .maybeSingle()
    if (error) throw new DatabaseRequestError(error, status)
    return data === null ? null : toConversation(data)
  }

  /** False when the caller has no such conversation; its messages go with it (cascade). */
  async delete(db: DatabaseClient, id: string): Promise<boolean> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.conversations)
      .delete()
      .eq('id', id)
      .select('id')
    if (error) throw new DatabaseRequestError(error, status)
    return data.length > 0
  }

  async #count(db: DatabaseClient): Promise<number> {
    const { error, count, status } = await db
      .from(DATABASE_RELATIONS.conversations)
      .select('id', { count: 'exact', head: true })
    if (error) throw new DatabaseRequestError(error, status)
    return exactCount(count)
  }
}
