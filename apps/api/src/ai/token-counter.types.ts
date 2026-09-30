export interface TokenCounting {
  count(text: string): number
  /** Pieces of at most `maxTokens` tokens that join back into `text`; no character is cut. */
  splitByTokens(text: string, maxTokens: number): string[]
}
