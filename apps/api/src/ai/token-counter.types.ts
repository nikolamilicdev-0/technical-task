/** Token arithmetic that chunking and prompt budgets depend on; `TokenCounter` implements it. */
export interface TokenCounting {
  count(text: string): number
  /** Consecutive pieces of at most `maxTokens` tokens (one character is never cut) joining back into `text`. */
  splitByTokens(text: string, maxTokens: number): string[]
}
