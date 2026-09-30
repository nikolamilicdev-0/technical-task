import type { UsageKind } from '@kb/contracts'

import type { Dictionary } from '@/core/i18n/dictionary'
import { pluralize } from '@/core/i18n/interpolate'
import type { UsageStrings } from '@/features/usage/types'

export function getUsageStrings(dictionary: Dictionary): UsageStrings {
  return dictionary.usage
}

export function describeEstimated(strings: UsageStrings, estimatedRequests: number): string | null {
  return estimatedRequests > 0 ? pluralize(strings.totals.estimated, estimatedRequests) : null
}

export function describeKind(strings: UsageStrings, kind: UsageKind): string {
  return strings.kinds[kind]
}
