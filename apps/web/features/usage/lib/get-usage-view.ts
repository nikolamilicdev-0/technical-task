import type { UsageSummary } from '@kb/contracts'

import type { UsageView } from '@/features/usage/types'

/** A loaded summary wins over a failed refetch; zero requests is the empty state, not zeros. */
export function getUsageView(summary: UsageSummary | undefined, isError: boolean): UsageView {
  if (!summary) return isError ? { status: 'error' } : { status: 'loading' }
  if (summary.totals.requests === 0) return { status: 'empty' }
  return { status: 'summary', summary }
}
