import type { Readiness } from '@kb/contracts'

import { VECTOR_DIMENSIONS } from '../../database/database.constants.js'
import type { ReadinessFacts } from './health.types.js'

type Checks = Readiness['checks']

/** Ready once the database answers with the vector size the API writes; AI is reported, not required. */
export function assessReadiness({ columnDimensions, aiConfigured }: ReadinessFacts): Readiness {
  const checks: Checks = {
    database: columnDimensions === undefined ? 'error' : 'ok',
    embeddingDimensions: dimensionsCheck(columnDimensions),
    ai: aiConfigured ? 'ok' : 'unconfigured',
  }
  const ready = checks.database === 'ok' && checks.embeddingDimensions === 'ok'
  return { status: ready ? 'ok' : 'error', checks }
}

function dimensionsCheck(columnDimensions: number | undefined): Checks['embeddingDimensions'] {
  if (columnDimensions === undefined) return 'unknown'
  return columnDimensions === VECTOR_DIMENSIONS ? 'ok' : 'mismatch'
}
