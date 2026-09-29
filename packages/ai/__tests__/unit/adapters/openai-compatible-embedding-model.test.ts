import { NotFoundError } from 'openai'
import { describe, expect, it } from 'vitest'

import { OpenAiCompatibleEmbeddingModel } from '../../../src/adapters/openai-compatible/openai-compatible-embedding-model.js'
import type { ResolvedEmbeddingEndpoint } from '../../../src/providers/resolve-endpoint.types.js'
import { FakeOpenAiClient, type FakeOpenAiScript } from '../../fake-openai-client.js'
import { buildEmbeddingEndpoint, buildEmbeddingResponse, captureAiError } from '../../fixtures.js'

const OLLAMA: Partial<ResolvedEmbeddingEndpoint> = {
  provider: 'ollama',
  model: 'nomic-embed-text',
  supportsEmbeddingDimensions: false,
}

function vectorOf(length: number): number[] {
  return Array.from({ length }, (_, index) => index / length)
}

function setup(script: FakeOpenAiScript = {}, endpoint: Partial<ResolvedEmbeddingEndpoint> = {}) {
  const client = new FakeOpenAiClient(script)
  const model = new OpenAiCompatibleEmbeddingModel(client, buildEmbeddingEndpoint(endpoint))
  return { calls: client.embeddings.calls, model }
}

describe('OpenAiCompatibleEmbeddingModel', () => {
  it('returns vectors in input order even when the provider reorders them', async () => {
    const response = buildEmbeddingResponse(
      [
        [0, 1],
        [1, 0],
      ],
      [1, 0]
    )
    const { model } = setup({ embeddingResponses: [response] })
    expect(await model.embed({ texts: ['first', 'second'] })).toEqual({
      embeddings: [
        [1, 0],
        [0, 1],
      ],
      dimensions: 2,
      usage: { promptTokens: 8, completionTokens: 0, totalTokens: 8 },
      model: 'text-embedding-3-small',
    })
  })

  it('accepts the first vector without an index, as Gemini sends it', async () => {
    const response = buildEmbeddingResponse([
      [0, 1],
      [1, 0],
    ])
    Reflect.deleteProperty(response.data[0], 'index')
    const { model } = setup({ embeddingResponses: [response] })
    const { embeddings } = await model.embed({ texts: ['first', 'second'] })
    expect(embeddings).toEqual([
      [0, 1],
      [1, 0],
    ])
  })

  it('always requests floats and forwards the caller signal', async () => {
    const { signal } = new AbortController()
    const { calls, model } = setup({ embeddingResponses: [buildEmbeddingResponse([[1, 0]])] })
    await model.embed({ texts: ['alpha'], signal })
    expect(calls).toEqual([
      {
        body: { model: 'text-embedding-3-small', input: ['alpha'], encoding_format: 'float' },
        options: { signal },
      },
    ])
  })

  it.each([
    ['configured and accepted', { dimensions: 3, supportsEmbeddingDimensions: true }, 3],
    ['configured but not accepted', { ...OLLAMA, dimensions: 3 }, undefined],
    ['not configured', {}, undefined],
  ])('sends dimensions only when %s', async (_, endpoint, dimensions) => {
    const { calls, model } = setup(
      { embeddingResponses: [buildEmbeddingResponse([vectorOf(3)])] },
      endpoint
    )
    await model.embed({ texts: ['alpha'] })
    expect(calls[0]?.body.dimensions).toBe(dimensions)
  })

  it.each([
    ['without configured dimensions', {}, 'text-embedding-3-small'],
    ['with configured dimensions', { dimensions: 512 }, 'text-embedding-3-small#512'],
  ])('reports its signature %s', (_, endpoint, signature) => {
    expect(setup({}, endpoint).model.signature).toBe(signature)
  })

  it('rejects vectors that miss the configured size and explains the fix', async () => {
    const response = buildEmbeddingResponse([vectorOf(768)])
    const { model } = setup({ embeddingResponses: [response] }, { ...OLLAMA, dimensions: 512 })
    const error = await captureAiError(() => model.embed({ texts: ['alpha'] }))
    expect(error.code).toBe('unsupported')
    expect(error.message).toBe(
      '"nomic-embed-text" returned 768-dimension vectors instead of 512; ollama cannot shorten vectors, so unset AI_EMBEDDING_DIMENSIONS or set it to 768'
    )
  })

  it('rejects a later response whose size differs from the first one', async () => {
    const responses = [buildEmbeddingResponse([vectorOf(3)]), buildEmbeddingResponse([vectorOf(2)])]
    const { model } = setup({ embeddingResponses: responses })
    await model.embed({ texts: ['alpha'] })
    const error = await captureAiError(() => model.embed({ texts: ['beta'] }))
    expect(error.code).toBe('unsupported')
    expect(error.message).toContain('restart and re-index')
  })

  it('rejects vectors of mixed sizes within one response', async () => {
    const response = buildEmbeddingResponse([vectorOf(3), vectorOf(2)])
    const { model } = setup({ embeddingResponses: [response] })
    const error = await captureAiError(() => model.embed({ texts: ['alpha', 'beta'] }))
    expect(error.code).toBe('unsupported')
  })

  it.each([
    ['a missing embedding', buildEmbeddingResponse([vectorOf(2)])],
    ['a duplicated index', buildEmbeddingResponse([vectorOf(2), vectorOf(2)], [0, 0])],
  ])('rejects a response with %s as a server fault', async (_, response) => {
    const { model } = setup({ embeddingResponses: [response] })
    const error = await captureAiError(() => model.embed({ texts: ['alpha', 'beta'] }))
    expect(error).toMatchObject({
      code: 'server',
      details: { provider: 'openai', model: 'text-embedding-3-small' },
    })
  })

  it.each([
    ['no texts', []],
    ['an empty text', ['alpha', '']],
  ])('rejects %s without calling the provider', async (_, texts) => {
    const { calls, model } = setup()
    const error = await captureAiError(() => model.embed({ texts }))
    expect(error.code).toBe('invalid_request')
    expect(calls).toEqual([])
  })

  it('maps a missing model to not_found and names the model variable', async () => {
    const failure = new NotFoundError(404, { message: 'model not found' }, undefined, new Headers())
    const { model } = setup({ failure }, OLLAMA)
    const error = await captureAiError(() => model.embed({ texts: ['alpha'] }))
    expect(error).toMatchObject({ code: 'not_found', details: { provider: 'ollama', status: 404 } })
    expect(error.message).toContain('AI_EMBEDDING_MODEL')
  })

  it('maps an aborted call to aborted', async () => {
    const signal = AbortSignal.abort()
    const error = await captureAiError(() => setup().model.embed({ texts: ['alpha'], signal }))
    expect(error.code).toBe('aborted')
  })
})
