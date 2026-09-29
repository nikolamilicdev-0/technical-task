import { AiProviderError, type AiErrorCode } from '@kb/ai'
import { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { DatabaseRequestError } from '../../../../src/database/database-error.js'
import { INGESTION_MESSAGES } from '../../../../src/modules/ingestion/ingestion.constants.js'
import { classifyIngestionFailure } from '../../../../src/modules/ingestion/ingestion-failure.js'

const providerError = (code: AiErrorCode) =>
  new AiProviderError(code, `Provider failed with ${code}`, { provider: 'gemini' })
const databaseError = (status: number, code = '') =>
  new DatabaseRequestError(
    new PostgrestError({ message: 'boom', details: '', hint: '', code }),
    status
  )

describe('classifyIngestionFailure', () => {
  it.each<[AiErrorCode, boolean]>([
    ['rate_limited', true],
    ['timeout', true],
    ['connection', true],
    ['server', true],
    ['authentication', false],
    ['invalid_request', false],
    ['unsupported', false],
  ])('keeps the message of a %s provider error, retryable: %s', (code, retryable) => {
    expect(classifyIngestionFailure(providerError(code))).toEqual({
      message: `Provider failed with ${code}`,
      retryable,
      expected: true,
    })
  })

  it.each([
    ['no answer at all', 0, INGESTION_MESSAGES.databaseUnavailable, true],
    ['a server error', 503, INGESTION_MESSAGES.databaseUnavailable, true],
    ['a rejected request', 400, INGESTION_MESSAGES.databaseRejected, false],
  ])('hides the details of a database failure with %s', (_, status, message, retryable) => {
    expect(classifyIngestionFailure(databaseError(status))).toEqual({
      message,
      retryable,
      expected: true,
    })
  })

  it('carries the provider’s retry hint', () => {
    const error = new AiProviderError('rate_limited', 'Slow down', {
      provider: 'openai',
      retryAfterSeconds: 42,
    })

    expect(classifyIngestionFailure(error)).toMatchObject({
      retryable: true,
      retryAfterSeconds: 42,
    })
  })

  it('retries a run whose reused vector vanished (NOT NULL violation on upsert)', () => {
    expect(classifyIngestionFailure(databaseError(400, '23502'))).toEqual({
      message: INGESTION_MESSAGES.storedChunksChanged,
      retryable: true,
      expected: true,
    })
  })

  it('fails for good on a vector the column cannot hold', () => {
    const error = new RangeError('The embedding has 3072 dimensions but the column holds 1536')

    expect(classifyIngestionFailure(error)).toEqual({
      message: error.message,
      retryable: false,
      expected: true,
    })
  })

  it('reports anything else as unexpected, without its internals', () => {
    expect(classifyIngestionFailure(new TypeError('x is undefined'))).toEqual({
      message: INGESTION_MESSAGES.unexpected,
      retryable: false,
      expected: false,
    })
  })
})
