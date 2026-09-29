import { type AiClients, createAiClients } from '@kb/ai'
import { Global, Logger, Module } from '@nestjs/common'

import type { AppConfig } from '../config/app-config.types.js'
import { APP_CONFIG } from '../config/config.constants.js'
import { AI_CLIENTS, AI_STATUS, CHAT_MODEL, EMBEDDING_MODEL } from './ai.constants.js'
import type { AiStatus } from './ai-status.types.js'
import { TokenCounter } from './token-counter.js'
import { createUnconfiguredAiClients } from './unconfigured-ai-clients.js'

const logger = new Logger('AiModule')

function provideAiClients({ ai }: AppConfig): AiClients {
  if (ai.configured) return createAiClients(ai.config)
  logger.warn(`${ai.problem}. Chat and document indexing fail until .env is fixed.`)
  return createUnconfiguredAiClients(ai.problem)
}

// Built field by field so the status can never carry the configuration's API keys along.
function provideAiStatus({ ai }: AppConfig): AiStatus {
  return ai.configured ? { configured: true } : { configured: false, problem: ai.problem }
}

/** Binds the chat and embedding ports; an incomplete AI setup binds failing stand-ins instead. */
@Global()
@Module({
  providers: [
    { provide: AI_CLIENTS, inject: [APP_CONFIG], useFactory: provideAiClients },
    { provide: CHAT_MODEL, inject: [AI_CLIENTS], useFactory: ({ chat }: AiClients) => chat },
    {
      provide: EMBEDDING_MODEL,
      inject: [AI_CLIENTS],
      useFactory: ({ embedding }: AiClients) => embedding,
    },
    { provide: AI_STATUS, inject: [APP_CONFIG], useFactory: provideAiStatus },
    TokenCounter,
  ],
  exports: [CHAT_MODEL, EMBEDDING_MODEL, AI_STATUS, TokenCounter],
})
export class AiModule {}
