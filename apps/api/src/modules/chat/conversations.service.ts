import type {
  Conversation,
  ConversationDetail,
  ConversationList,
  CreateConversationInput,
  ListConversationsQuery,
  UpdateConversationInput,
} from '@kb/contracts'
import { Injectable } from '@nestjs/common'

import type { UserContext } from '../../database/user-context.types.js'
import { conversationNotFound } from './chat-errors.js'
import { ConversationsRepository } from './conversations.repository.js'
import { MessagesRepository } from './messages.repository.js'

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversations: ConversationsRepository,
    private readonly messages: MessagesRepository
  ) {}

  async list(user: UserContext, query: ListConversationsQuery): Promise<ConversationList> {
    const page = await this.conversations.list(user.db, query)
    return { ...page, limit: query.limit, offset: query.offset }
  }

  create(user: UserContext, input: CreateConversationInput): Promise<Conversation> {
    return this.conversations.insert(user.db, input)
  }

  async get(user: UserContext, id: string): Promise<ConversationDetail> {
    const [conversation, messages] = await Promise.all([
      this.conversations.findById(user.db, id),
      this.messages.listByConversation(user.db, id),
    ])
    if (conversation === null) throw conversationNotFound()
    return { conversation, messages }
  }

  async update(
    user: UserContext,
    id: string,
    input: UpdateConversationInput
  ): Promise<Conversation> {
    const conversation = await this.conversations.update(user.db, id, input)
    if (conversation === null) throw conversationNotFound()
    return conversation
  }

  async remove(user: UserContext, id: string): Promise<void> {
    if (!(await this.conversations.delete(user.db, id))) throw conversationNotFound()
  }
}
