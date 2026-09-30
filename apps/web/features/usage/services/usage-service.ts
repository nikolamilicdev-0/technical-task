import {
  apiRoutes,
  type UsageSummary,
  type UsageSummaryQuery,
  usageSummarySchema,
} from '@kb/contracts'

import { getApiClient } from '@/core/api/browser-client'

export const usageService = {
  summary: (query: UsageSummaryQuery, signal?: AbortSignal): Promise<UsageSummary> =>
    getApiClient().request(apiRoutes.usage.summary, {
      query,
      schema: usageSummarySchema,
      signal,
    }),
}
