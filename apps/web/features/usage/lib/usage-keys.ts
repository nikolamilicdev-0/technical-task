/** React Query keys of the usage feature; invalidating `all` refreshes every usage view. */
export const usageKeys = {
  all: ['usage'] as const,
  /** The summary of the last `days` calendar days, today included. */
  summary: (days: number) => [...usageKeys.all, 'summary', days] as const,
}
