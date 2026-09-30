import { readinessSchema } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { VECTOR_DIMENSIONS } from '../../../../src/database/database.constants.js'
import { assessReadiness } from '../../../../src/modules/health/readiness.js'

describe('assessReadiness', () => {
  it('is ready when the database answers with the vector size the API writes', () => {
    expect(assessReadiness({ columnDimensions: VECTOR_DIMENSIONS, aiConfigured: true })).toEqual({
      status: 'ok',
      checks: { database: 'ok', embeddingDimensions: 'ok', ai: 'ok' },
    })
  })

  it('stays ready without AI, reporting it as unconfigured', () => {
    const readiness = assessReadiness({ columnDimensions: VECTOR_DIMENSIONS, aiConfigured: false })

    expect(readiness.status).toBe('ok')
    expect(readiness.checks.ai).toBe('unconfigured')
  })

  it('is not ready when the column was migrated to another size', () => {
    expect(assessReadiness({ columnDimensions: 3072, aiConfigured: true })).toEqual({
      status: 'error',
      checks: { database: 'ok', embeddingDimensions: 'mismatch', ai: 'ok' },
    })
  })

  it('is not ready when the database does not answer', () => {
    expect(assessReadiness({ columnDimensions: undefined, aiConfigured: true })).toEqual({
      status: 'error',
      checks: { database: 'error', embeddingDimensions: 'unknown', ai: 'ok' },
    })
  })

  it('always satisfies the readiness contract', () => {
    for (const columnDimensions of [VECTOR_DIMENSIONS, 768, undefined]) {
      for (const aiConfigured of [true, false]) {
        const readiness = assessReadiness({ columnDimensions, aiConfigured })
        expect(readinessSchema.safeParse(readiness).success).toBe(true)
      }
    }
  })
})
