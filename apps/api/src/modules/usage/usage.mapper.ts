import { type UsageSummary, usageSummarySchema } from '@kb/contracts'

import { timestampColumn } from '../../database/column-schemas.js'
import type { Json } from '../../database/database.types.js'

// `usage_summary` echoes the window as jsonb timestamps (`+00:00`, microseconds).
const summaryResultSchema = usageSummarySchema.extend({
  from: timestampColumn,
  to: timestampColumn,
})

/** Validates the `usage_summary` jsonb against the contract. */
export function toUsageSummary(result: Json): UsageSummary {
  return summaryResultSchema.parse(result)
}
