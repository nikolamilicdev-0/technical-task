import { useQuery } from '@tanstack/react-query'

import { USAGE_PERIOD_DAYS, USAGE_STALE_TIME_MS } from '@/features/usage/constants'
import { usageKeys } from '@/features/usage/lib/usage-keys'
import { toUsageQuery } from '@/features/usage/lib/usage-window'
import { usageService } from '@/features/usage/services/usage-service'

/** The window is computed per request, so a refetch after midnight moves it along. */
export function useUsageSummary(days: number = USAGE_PERIOD_DAYS) {
  return useQuery({
    queryKey: usageKeys.summary(days),
    queryFn: ({ signal }) => usageService.summary(toUsageQuery(days, new Date()), signal),
    staleTime: USAGE_STALE_TIME_MS,
  })
}
