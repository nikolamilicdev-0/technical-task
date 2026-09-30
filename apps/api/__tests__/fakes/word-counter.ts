import type { TokenCounting } from '../../src/ai/token-counter.types.js'

const WORD_WITH_TRAILING_SPACE = /\S+\s*/g
const LEADING_WHITESPACE = /^\s*/

/** Counts every whitespace-separated word as one token, so budgets in tests read as word counts. */
export class WordCounter implements TokenCounting {
  count(text: string): number {
    return text.match(WORD_WITH_TRAILING_SPACE)?.length ?? 0
  }

  splitByTokens(text: string, maxTokens: number): string[] {
    const leading = LEADING_WHITESPACE.exec(text)?.[0] ?? ''
    const words = text.slice(leading.length).match(WORD_WITH_TRAILING_SPACE) ?? []
    const pieces: string[] = []
    for (let start = 0; start < words.length; start += maxTokens) {
      pieces.push(words.slice(start, start + maxTokens).join(''))
    }
    if (pieces.length > 0) pieces[0] = leading + pieces[0]
    return pieces
  }
}
