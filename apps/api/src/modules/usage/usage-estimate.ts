import type { ChatMessage, TokenUsage } from '@kb/ai'

import type { TokenCounting } from '../../ai/token-counter.types.js'
import type { MeteredUsage } from './usage.types.js'

// Chat formats wrap every message in role and separator tokens (about four with cl100k).
const CHAT_MESSAGE_OVERHEAD_TOKENS = 4

export function estimateChatUsage(
  messages: readonly ChatMessage[],
  answer: string,
  counter: TokenCounting
): TokenUsage {
  const promptTokens = messages.reduce(
    (total, { content }) => total + counter.count(content) + CHAT_MESSAGE_OVERHEAD_TOKENS,
    0
  )
  const completionTokens = counter.count(answer)
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens }
}

export function estimateEmbeddingUsage(
  texts: readonly string[],
  counter: TokenCounting
): TokenUsage {
  const promptTokens = texts.reduce((total, text) => total + counter.count(text), 0)
  return { promptTokens, completionTokens: 0, totalTokens: promptTokens }
}

// An all-zero report counts as none: every call consumes input tokens.
export function meterUsage(
  reported: TokenUsage | undefined,
  estimate: () => TokenUsage
): MeteredUsage {
  if (reported === undefined || reported.totalTokens === 0)
    return { ...estimate(), estimated: true }
  return { ...reported, estimated: false }
}
