import { Injectable } from '@nestjs/common'
import { Tiktoken } from 'js-tiktoken/lite'
import cl100k_base from 'js-tiktoken/ranks/cl100k_base'

import type { TokenCounting } from './token-counter.types.js'

// What a token boundary inside a multi-byte character decodes to.
const REPLACEMENT_CHARACTER = '\uFFFD'

/** Real cl100k counts (DEC-006): a characters-divided-by-four estimate is far off for code. */
@Injectable()
export class TokenCounter implements TokenCounting {
  readonly #encoding = new Tiktoken(cl100k_base)

  count(text: string): number {
    return this.#encode(text).length
  }

  splitByTokens(text: string, maxTokens: number): string[] {
    if (!Number.isInteger(maxTokens) || maxTokens < 1) {
      throw new RangeError(`maxTokens must be a positive integer, got ${maxTokens}`)
    }
    const tokens = this.#encode(text)
    const pieces: string[] = []
    let start = 0
    while (start < tokens.length) {
      const end = this.#characterBoundary(tokens, start, Math.min(start + maxTokens, tokens.length))
      pieces.push(this.#encoding.decode(tokens.slice(start, end)))
      start = end
    }
    return pieces
  }

  // Moves a cut that would split a character: back when possible, forward when the character alone
  // needs more than the budget (an emoji can take several tokens).
  #characterBoundary(tokens: readonly number[], start: number, end: number): number {
    const splitsCharacter = (cut: number): boolean =>
      cut < tokens.length &&
      this.#encoding.decode(tokens.slice(start, cut)).endsWith(REPLACEMENT_CHARACTER)
    let cut = end
    while (cut - start > 1 && splitsCharacter(cut)) cut -= 1
    while (splitsCharacter(cut)) cut += 1
    return cut
  }

  // Document text is untrusted: `<|endoftext|>` and friends count as plain text instead of throwing.
  #encode(text: string): number[] {
    return this.#encoding.encode(text, [], [])
  }
}
