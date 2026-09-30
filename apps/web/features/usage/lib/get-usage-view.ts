import type { UsageSummary } from '@kb/contracts'

import type { UsageView } from '@/features/usage/types'

/**
 * What the usage page shows. A loaded summary wins over a failed background refetch, and a
 * period without a single metered request is the empty state rather than a page of zeros.
 */
export function getUsageView(summary: UsageSummary | undefined, isError: boolean): UsageView {
  if (!summary) return isError ? { status: 'error' } : { status: 'loading' }
  if (summary.totals.requests === 0) return { status: 'empty' }
  return { status: 'summary', summary }
}
