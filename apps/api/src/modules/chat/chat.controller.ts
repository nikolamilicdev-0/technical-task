import { apiRoutes, idSchema, type SendMessageInput, sendMessageSchema } from '@kb/contracts'
import { Controller, Headers, HttpStatus, Post, Res } from '@nestjs/common'
import type { Response } from 'express'

import { CurrentUser } from '../../common/auth/current-user.decorator.js'
import { abortOnClose } from '../../common/http/abort-on-close.js'
import { acceptsEventStream } from '../../common/http/accepts-event-stream.js'
import { ZodBody, ZodParam } from '../../common/validation/zod-params.decorators.js'
import type { UserContext } from '../../database/user-context.types.js'
import { RateLimitBucket } from '../../throttling/rate-limit-bucket.decorator.js'
import { CONVERSATION_ID_PARAM, CONVERSATION_MESSAGES_ROUTE } from './chat.constants.js'
import { collectChatResult } from './chat-result-collector.js'
import { RagChatService } from './rag-chat.service.js'
import { SseWriter } from './sse-writer.js'

@Controller(apiRoutes.conversations.collection)
export class ChatController {
  constructor(
    private readonly chat: RagChatService,
    private readonly sse: SseWriter
  ) {}

  @Post(CONVERSATION_MESSAGES_ROUTE)
  @RateLimitBucket('chat')
  async send(
    @CurrentUser() user: UserContext,
    @ZodParam(CONVERSATION_ID_PARAM, idSchema) conversationId: string,
    @ZodBody(sendMessageSchema) input: SendMessageInput,
    @Headers('accept') accept: string | undefined,
    @Res() response: Response
  ): Promise<void> {
    const signal = abortOnClose(response)
    const run = await this.chat.prepare(user, conversationId, input)
    if (acceptsEventStream(accept)) return this.sse.stream(response, run.events(signal))
    const result = await collectChatResult(run.events(signal))
    if (result === null) response.end()
    else response.status(HttpStatus.OK).json(result)
  }
}
