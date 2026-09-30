import { healthSchema, readinessSchema } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { issuePaths } from '../fixtures.js'

describe('healthSchema', () => {
  it('accepts a live process', () => {
    expect(
      healthSchema.safeParse({ status: 'ok', uptimeSeconds: 12.5, version: '0.1.0' }).success
    ).toBe(true)
  })

  it.each([
    ['a non-ok status', { status: 'down', uptimeSeconds: 1, version: '0.1.0' }, 'status'],
    ['a negative uptime', { status: 'ok', uptimeSeconds: -1, version: '0.1.0' }, 'uptimeSeconds'],
    ['an empty version', { status: 'ok', uptimeSeconds: 1, version: '' }, 'version'],
  ])('rejects %s', (_, input, path) => {
    expect(issuePaths(healthSchema, input)).toContain(path)
  })
})

describe('readinessSchema', () => {
  it.each([
    [
      'a ready service',
      { status: 'ok', checks: { database: 'ok', embeddingDimensions: 'ok', ai: 'ok' } },
    ],
    [
      'a ready service whose AI variables are still empty',
      { status: 'ok', checks: { database: 'ok', embeddingDimensions: 'ok', ai: 'unconfigured' } },
    ],
    [
      'a migrated column that does not match the API',
      { status: 'error', checks: { database: 'ok', embeddingDimensions: 'mismatch', ai: 'ok' } },
    ],
    [
      'an unreachable database',
      { status: 'error', checks: { database: 'error', embeddingDimensions: 'unknown', ai: 'ok' } },
    ],
  ])('accepts %s', (_, input) => {
    expect(readinessSchema.safeParse(input).success).toBe(true)
  })

  it.each([
    [
      'an unknown database result',
      { status: 'ok', checks: { database: 'slow', embeddingDimensions: 'ok', ai: 'ok' } },
      'checks.database',
    ],
    [
      'an unknown AI result',
      { status: 'ok', checks: { database: 'ok', embeddingDimensions: 'ok', ai: 'missing' } },
      'checks.ai',
    ],
    [
      'a missing AI check',
      { status: 'ok', checks: { database: 'ok', embeddingDimensions: 'ok' } },
      'checks.ai',
    ],
  ])('rejects %s', (_, input, path) => {
    expect(issuePaths(readinessSchema, input)).toContain(path)
  })
})
