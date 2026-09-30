import { Module } from '@nestjs/common'

import { RetrievalModule } from '../retrieval/retrieval.module.js'
import { UsageModule } from '../usage/usage.module.js'
import { ChatController } from './chat.controller.js'
import { ConversationsController } from './conversations.controller.js'
import { ConversationsRepository } from './conversations.repository.js'
import { ConversationsService } from './conversations.service.js'
import { MessagesRepository } from './messages.repository.js'
import { PromptBuilder } from './prompt-builder.js'
import { QueryRewriter } from './query-rewriter.js'
import { RagChatService } from './rag-chat.service.js'
import { SseWriter } from './sse-writer.js'

/** Conversations and the retrieval-augmented, streamed answers inside them. */
@Module({
  imports: [RetrievalModule, UsageModule],
  controllers: [ConversationsController, ChatController],
  providers: [
    ConversationsService,
    ConversationsRepository,
    MessagesRepository,
    RagChatService,
    PromptBuilder,
    QueryRewriter,
    SseWriter,
  ],
})
export class ChatModule {}
