import { AiProviderError, FakeEmbeddingModel } from '@kb/ai'
import { describe, expect, it } from 'vitest'

import { captureAiError } from '../../fixtures.js'

const UNIT_LENGTH_PRECISION = 12

function norm(vector: number[]): number {
  return Math.hypot(...vector)
}

describe('FakeEmbeddingModel', () => {
  it('maps equal texts to equal unit vectors across calls and instances', async () => {
    const first = await new FakeEmbeddingModel().embed({ texts: ['vacation policy'] })
    const second = await new FakeEmbeddingModel().embed({ texts: ['vacation policy'] })
    expect(first.embeddings).toEqual(second.embeddings)
    expect(norm(first.embeddings[0] ?? [])).toBeCloseTo(1, UNIT_LENGTH_PRECISION)
  })

  it('maps different texts to different vectors', async () => {
    const { embeddings } = await new FakeEmbeddingModel().embed({ texts: ['alpha', 'beta'] })
    expect(embeddings[0]).not.toEqual(embeddings[1])
  })

  it('honours the configured size and reports it in the signature', async () => {
    const model = new FakeEmbeddingModel({ model: 'fake-large', dimensions: 1536 })
    const result = await model.embed({ texts: ['alpha'] })
    expect(result.embeddings[0]).toHaveLength(1536)
    expect(result).toMatchObject({ dimensions: 1536, model: 'fake-large' })
    expect(model.signature).toBe('fake-large#1536')
  })

  it('records requests and reports approximate usage', async () => {
    const model = new FakeEmbeddingModel()
    const result = await model.embed({ texts: ['12345678', 'abc'] })
    expect(model.requests).toEqual([{ texts: ['12345678', 'abc'] }])
    expect(result.usage).toEqual({ promptTokens: 3, completionTokens: 0, totalTokens: 3 })
  })

  it('throws scripted failures one call at a time', async () => {
    const failure = new AiProviderError('rate_limited', 'Slow down', { provider: 'fake' })
    const model = new FakeEmbeddingModel({ failures: [failure] })
    await expect(model.embed({ texts: ['alpha'] })).rejects.toBe(failure)
    await expect(model.embed({ texts: ['alpha'] })).resolves.toMatchObject({ dimensions: 8 })
  })

  it.each([
    ['no texts', []],
    ['an empty text', ['']],
  ])('rejects %s like the real adapter', async (_, texts) => {
    const error = await captureAiError(() => new FakeEmbeddingModel().embed({ texts }))
    expect(error.code).toBe('invalid_request')
  })

  it('throws aborted for an aborted signal', async () => {
    const request = { texts: ['alpha'], signal: AbortSignal.abort() }
    const error = await captureAiError(() => new FakeEmbeddingModel().embed(request))
    expect(error).toMatchObject({ code: 'aborted', details: { model: 'fake-embedding' } })
  })

  it.each([0, 2.5])('rejects %s dimensions', (dimensions) => {
    expect(() => new FakeEmbeddingModel({ dimensions })).toThrow(RangeError)
  })
})
