import {
  apiRoutes,
  type Conversation,
  type ConversationDetail,
  type ConversationList,
  type CreateConversationInput,
  idSchema,
  type ListConversationsQuery,
  listConversationsQuerySchema,
  type UpdateConversationInput,
  updateConversationSchema,
} from '@kb/contracts'
import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common'

import { CurrentUser } from '../../common/auth/current-user.decorator.js'
import { ZodBody, ZodParam, ZodQuery } from '../../common/validation/zod-params.decorators.js'
import type { UserContext } from '../../database/user-context.types.js'
import { CONVERSATION_ID_PARAM, CONVERSATION_ITEM_ROUTE } from './chat.constants.js'
import { createConversationBodySchema } from './conversations.schema.js'
import { ConversationsService } from './conversations.service.js'

@Controller(apiRoutes.conversations.collection)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(
    @CurrentUser() user: UserContext,
    @ZodQuery(listConversationsQuerySchema) query: ListConversationsQuery
  ): Promise<ConversationList> {
    return this.conversations.list(user, query)
  }

  @Post()
  create(
    @CurrentUser() user: UserContext,
    @ZodBody(createConversationBodySchema) input: CreateConversationInput
  ): Promise<Conversation> {
    return this.conversations.create(user, input)
  }

  @Get(CONVERSATION_ITEM_ROUTE)
  get(
    @CurrentUser() user: UserContext,
    @ZodParam(CONVERSATION_ID_PARAM, idSchema) id: string
  ): Promise<ConversationDetail> {
    return this.conversations.get(user, id)
  }

  @Patch(CONVERSATION_ITEM_ROUTE)
  update(
    @CurrentUser() user: UserContext,
    @ZodParam(CONVERSATION_ID_PARAM, idSchema) id: string,
    @ZodBody(updateConversationSchema) input: UpdateConversationInput
  ): Promise<Conversation> {
    return this.conversations.update(user, id, input)
  }

  @Delete(CONVERSATION_ITEM_ROUTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: UserContext,
    @ZodParam(CONVERSATION_ID_PARAM, idSchema) id: string
  ): Promise<void> {
    return this.conversations.remove(user, id)
  }
}
