import type { Message } from '@kb/contracts'
import { Injectable } from '@nestjs/common'

import type { DatabaseClient } from '../../database/database-client.types.js'
import { DATABASE_RELATIONS } from '../../database/database.constants.js'
import { DatabaseRequestError } from '../../database/database-error.js'
import { MESSAGE_COLUMNS } from './chat.constants.js'
import type { MessageInsertRow } from './chat.types.js'
import { toMessage } from './messages.mapper.js'

/**
 * Messages through the caller's client. They are immutable and go with their conversation;
 * RLS only lets the caller add them to conversations of their own.
 */
@Injectable()
export class MessagesRepository {
  /** The whole conversation, oldest first; empty when the caller cannot see it. */
  async listByConversation(db: DatabaseClient, conversationId: string): Promise<Message[]> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.messages)
      .select(MESSAGE_COLUMNS)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    if (error) throw new DatabaseRequestError(error, status)
    return data.map(toMessage)
  }

  /** The latest `limit` messages, oldest first. */
  async listRecent(db: DatabaseClient, conversationId: string, limit: number): Promise<Message[]> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.messages)
      .select(MESSAGE_COLUMNS)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)
    if (error) throw new DatabaseRequestError(error, status)
    return data.map(toMessage).reverse()
  }

  /** Stores a message; a trigger bumps the conversation's `updated_at`. */
  async insert(db: DatabaseClient, row: MessageInsertRow): Promise<Message> {
    const { data, error, status } = await db
      .from(DATABASE_RELATIONS.messages)
      .insert(row)
      .select(MESSAGE_COLUMNS)
      .single()
    if (error) throw new DatabaseRequestError(error, status)
    return toMessage(data)
  }
}
