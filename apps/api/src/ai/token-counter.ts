import { Injectable } from '@nestjs/common'
import { Tiktoken } from 'js-tiktoken/lite'
import cl100k_base from 'js-tiktoken/ranks/cl100k_base'

import { sliceLongRuns } from './long-runs.js'
import type { TokenCounting } from './token-counter.types.js'

// A UTF-8 character spans at most four bytes: three tokens on each side of a cut hold it whole.
const CHARACTER_CONTEXT_TOKENS = 3

let sharedEncoding: Tiktoken | undefined

// Building the cl100k rank table takes a noticeable fraction of a second; every counter shares one.
function cl100k(): Tiktoken {
  sharedEncoding ??= new Tiktoken(cl100k_base)
  return sharedEncoding
}

@Injectable()
export class TokenCounter implements TokenCounting {
  readonly #encoding = cl100k()

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
    let cut = end
    while (cut - start > 1 && this.#splitsCharacter(tokens, cut)) cut -= 1
    while (this.#splitsCharacter(tokens, cut)) cut += 1
    return cut
  }

  // Only a cut inside a character decodes differently apart than together, so a U+FFFD that is
  // really in the text is not mistaken for a split character.
  #splitsCharacter(tokens: readonly number[], cut: number): boolean {
    if (cut <= 0 || cut >= tokens.length) return false
    const before = tokens.slice(Math.max(0, cut - CHARACTER_CONTEXT_TOKENS), cut)
    const after = tokens.slice(cut, cut + CHARACTER_CONTEXT_TOKENS)
    const apart = this.#encoding.decode(before) + this.#encoding.decode(after)
    return apart !== this.#encoding.decode([...before, ...after])
  }

  // Document text is untrusted: `<|endoftext|>` and friends count as plain text, not as an error,
  // and long runs are encoded in slices, since one piece takes quadratic time.
  #encode(text: string): number[] {
    return sliceLongRuns(text).flatMap((slice) => this.#encoding.encode(slice, [], []))
  }
}
