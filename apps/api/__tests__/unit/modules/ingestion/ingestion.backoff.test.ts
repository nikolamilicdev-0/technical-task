import { describe, expect, it } from 'vitest'

import {
  nextRetryInSeconds,
  retryDelaySeconds,
} from '../../../../src/modules/ingestion/ingestion.backoff.js'
import { MAX_RETRY_IN_SECONDS } from '../../../../src/modules/ingestion/ingestion.constants.js'

describe('retryDelaySeconds', () => {
  it('starts at 30 seconds and doubles with every attempt', () => {
    expect([1, 2, 3, 4, 5, 6].map(retryDelaySeconds)).toEqual([30, 60, 120, 240, 480, 960])
  })

  it('never waits more than 30 minutes', () => {
    expect([7, 8, 20, 1_100].map(retryDelaySeconds)).toEqual([1_800, 1_800, 1_800, 1_800])
  })

  it('treats an attempt below 1 as the first', () => {
    expect(retryDelaySeconds(0)).toBe(30)
  })
})

describe('nextRetryInSeconds', () => {
  it.each([
    ['a transient failure with attempts left', true, 2, 60],
    ['a transient failure on the last attempt', true, 5, null],
    ['a permanent failure', false, 1, null],
  ])('schedules %s → %s', (_, retryable, attempt, expected) => {
    expect(nextRetryInSeconds({ retryable }, attempt, 5)).toBe(expected)
  })

  it('never retries sooner than the provider asked', () => {
    expect(nextRetryInSeconds({ retryable: true, retryAfterSeconds: 90 }, 1, 5)).toBe(90)
    expect(nextRetryInSeconds({ retryable: true, retryAfterSeconds: 12.5 }, 2, 5)).toBe(60)
  })

  it.each([1e12, Number.POSITIVE_INFINITY])(
    'caps a Retry-After of %s seconds to what a Postgres integer holds, still retrying',
    (retryAfterSeconds) => {
      expect(nextRetryInSeconds({ retryable: true, retryAfterSeconds }, 1, 5)).toBe(
        MAX_RETRY_IN_SECONDS
      )
    }
  )
})
