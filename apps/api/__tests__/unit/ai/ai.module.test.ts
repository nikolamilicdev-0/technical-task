import type { ChatModel, EmbeddingModel } from '@kb/ai'
import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeAll, describe, expect, it } from 'vitest'

import { AI_STATUS, CHAT_MODEL, EMBEDDING_MODEL } from '../../../src/ai/ai.constants.js'
import { AiModule } from '../../../src/ai/ai.module.js'
import type { AiStatus } from '../../../src/ai/ai-status.types.js'
import { TokenCounter } from '../../../src/ai/token-counter.js'
import { APP_CONFIG } from '../../../src/config/config.constants.js'
import { AppConfigModule } from '../../../src/config/config.module.js'
import { buildTestConfig, TEST_OPENAI_KEY } from '../../fixtures.js'

async function compileWith(env: Record<string, string>) {
  const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule, AiModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(buildTestConfig(env))
    .compile()
  return {
    status: moduleRef.get<AiStatus>(AI_STATUS),
    chat: moduleRef.get<ChatModel>(CHAT_MODEL),
    embedding: moduleRef.get<EmbeddingModel>(EMBEDDING_MODEL),
    tokenCounter: moduleRef.get(TokenCounter),
  }
}

describe('AiModule', () => {
  beforeAll(() => {
    Logger.overrideLogger(false)
  })

  it('binds the configured provider once the AI variables are complete', async () => {
    const { status, chat, embedding, tokenCounter } = await compileWith({
      AI_CHAT_API_KEY: TEST_OPENAI_KEY,
    })

    expect(status).toEqual({ configured: true })
    expect([chat.provider, chat.model]).toEqual(['openai', 'gpt-4o-mini'])
    expect(embedding.signature).toBe('text-embedding-3-small')
    expect(tokenCounter.count('hello world')).toBe(2)
  })

  it('still boots without an API key, binding stand-ins and reporting the problem', async () => {
    const { status, chat, embedding } = await compileWith({})

    expect(status.configured).toBe(false)
    if (status.configured) return
    expect(status.problem).toContain('AI_CHAT_API_KEY')
    expect(Object.keys(status)).toEqual(['configured', 'problem'])
    expect([chat.provider, embedding.model]).toEqual(['unconfigured', 'unconfigured'])
    await expect(chat.complete({ messages: [] })).rejects.toThrow(status.problem)
  })
})
