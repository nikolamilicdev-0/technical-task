export const usageKeys = {
  all: ['usage'] as const,
  summary: (days: number) => [...usageKeys.all, 'summary', days] as const,
}
