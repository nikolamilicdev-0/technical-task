import type { TokenUsage } from '@kb/ai'

import type { TokenCounting } from '../../ai/token-counter.types.js'
import type { MeteredUsage } from './usage.types.js'

/** What embedding `texts` costs: input tokens only, counted with cl100k. */
export function estimateEmbeddingUsage(
  texts: readonly string[],
  counter: TokenCounting
): TokenUsage {
  const promptTokens = texts.reduce((total, text) => total + counter.count(text), 0)
  return { promptTokens, completionTokens: 0, totalTokens: promptTokens }
}

/**
 * The provider's own counts, or `estimate()` flagged as estimated when it reported none (Gemini's
 * embeddings, for one); an all-zero report counts as none, since every call consumes input tokens.
 */
export function meterUsage(
  reported: TokenUsage | undefined,
  estimate: () => TokenUsage
): MeteredUsage {
  if (reported === undefined || reported.totalTokens === 0)
    return { ...estimate(), estimated: true }
  return { ...reported, estimated: false }
}
