import { randomUUID } from 'node:crypto'

import type {
  Citation,
  Conversation,
  CreateConversationInput,
  FinishReason,
  Message,
  PaginationQuery,
  UpdateConversationInput,
} from '@kb/contracts'

import type { DatabaseClient } from '../../src/database/database-client.types.js'
import type { ConversationPage, MessageInsertRow } from '../../src/modules/chat/chat.types.js'
import type { ConversationsRepository } from '../../src/modules/chat/conversations.repository.js'
import type { MessagesRepository } from '../../src/modules/chat/messages.repository.js'

type ConversationsStore = Pick<ConversationsRepository, keyof ConversationsRepository>
type MessagesStore = Pick<MessagesRepository, keyof MessagesRepository>

/** Both tables with their triggers: a new message bumps `updatedAt`, deletes cascade. */
class ChatTables {
  readonly conversations = new Map<string, Conversation>()
  readonly messages: Message[] = []
  readonly insertedRows: MessageInsertRow[] = []
  #clock = Date.parse('2026-09-30T08:00:00.000Z')

  /** Strictly increasing timestamps, so ordering never depends on the wall clock. */
  now(): string {
    this.#clock += 1_000
    return new Date(this.#clock).toISOString()
  }

  touch(conversationId: string): void {
    const conversation = this.conversations.get(conversationId)
    if (conversation !== undefined) {
      this.conversations.set(conversationId, { ...conversation, updatedAt: this.now() })
    }
  }
}

export class InMemoryConversationsRepository implements ConversationsStore {
  constructor(private readonly tables: ChatTables) {}

  async list(_db: DatabaseClient, { limit, offset }: PaginationQuery): Promise<ConversationPage> {
    const items = [...this.tables.conversations.values()].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)
    )
    return { items: items.slice(offset, offset + limit), total: items.length }
  }

  async findById(_db: DatabaseClient, id: string): Promise<Conversation | null> {
    return this.tables.conversations.get(id) ?? null
  }

  async insert(_db: DatabaseClient, { title }: CreateConversationInput): Promise<Conversation> {
    const now = this.tables.now()
    const conversation = { id: randomUUID(), title: title ?? null, createdAt: now, updatedAt: now }
    this.tables.conversations.set(conversation.id, conversation)
    return conversation
  }

  async update(
    _db: DatabaseClient,
    id: string,
    { title }: UpdateConversationInput
  ): Promise<Conversation | null> {
    return this.#rename(id, title, () => true)
  }

  async setTitleIfUntitled(
    _db: DatabaseClient,
    id: string,
    title: string
  ): Promise<Conversation | null> {
    return this.#rename(id, title, (current) => current.title === null)
  }

  async delete(_db: DatabaseClient, id: string): Promise<boolean> {
    const { messages } = this.tables
    const kept = messages.filter((message) => message.conversationId !== id)
    messages.splice(0, messages.length, ...kept)
    return this.tables.conversations.delete(id)
  }

  #rename(
    id: string,
    title: string,
    when: (current: Conversation) => boolean
  ): Conversation | null {
    const current = this.tables.conversations.get(id)
    if (current === undefined || !when(current)) return null
    const renamed = { ...current, title, updatedAt: this.tables.now() }
    this.tables.conversations.set(id, renamed)
    return renamed
  }
}

export class InMemoryMessagesRepository implements MessagesStore {
  readonly insertFailures: Error[] = []

  constructor(private readonly tables: ChatTables) {}

  async listByConversation(_db: DatabaseClient, conversationId: string): Promise<Message[]> {
    return this.tables.messages.filter((message) => message.conversationId === conversationId)
  }

  async listRecent(db: DatabaseClient, conversationId: string, limit: number): Promise<Message[]> {
    return (await this.listByConversation(db, conversationId)).slice(-limit)
  }

  async insert(_db: DatabaseClient, row: MessageInsertRow): Promise<Message> {
    const failure = this.insertFailures.shift()
    if (failure !== undefined) throw failure
    this.tables.insertedRows.push(row)
    const message = toMessage(row, this.tables.now())
    this.tables.messages.push(message)
    this.tables.touch(row.conversation_id)
    return message
  }
}

function toMessage(row: MessageInsertRow, createdAt: string): Message {
  const hasUsage = row.prompt_tokens != null && row.completion_tokens != null
  return {
    id: randomUUID(),
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    citations: (row.citations ?? []) as Citation[],
    ...(row.model == null ? {} : { model: row.model }),
    ...(row.finish_reason == null ? {} : { finishReason: row.finish_reason as FinishReason }),
    ...(hasUsage
      ? {
          usage: {
            promptTokens: row.prompt_tokens ?? 0,
            completionTokens: row.completion_tokens ?? 0,
            totalTokens: (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0),
            estimated: row.usage_estimated ?? false,
          },
        }
      : {}),
    createdAt,
  }
}

export function inMemoryChat() {
  const tables = new ChatTables()
  return {
    tables,
    conversations: new InMemoryConversationsRepository(tables),
    messages: new InMemoryMessagesRepository(tables),
  }
}
