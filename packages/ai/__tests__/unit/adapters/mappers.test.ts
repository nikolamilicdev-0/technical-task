import type { ChatRequest, FinishReason } from '@kb/ai'
import { describe, expect, it } from 'vitest'

import {
  toChatCompletion,
  toChatParams,
  toEmbeddingParams,
  toFinishReason,
  toTokenUsage,
} from '../../../src/adapters/openai-compatible/mappers.js'
import {
  buildChatEndpoint,
  buildCompletion,
  buildEmbeddingEndpoint,
  SERVED_CHAT_MODEL,
  USAGE,
} from '../../fixtures.js'

const REQUEST: ChatRequest = {
  messages: [
    { role: 'system', content: 'Answer from the sources.' },
    { role: 'user', content: 'What is RAG?' },
    { role: 'assistant', content: 'Retrieval-augmented generation.' },
  ],
}

describe('toChatParams', () => {
  it('sends the model and messages only by default', () => {
    expect(toChatParams(buildChatEndpoint(), REQUEST)).toEqual({
      model: 'gpt-4o-mini',
      messages: REQUEST.messages,
    })
  })

  it.each([
    ['max_completion_tokens', { max_completion_tokens: 256 }],
    ['max_tokens', { max_tokens: 256 }],
  ] as const)('caps the answer with %s', (maxTokensParam, cap) => {
    const params = toChatParams(buildChatEndpoint({ maxTokensParam }), {
      ...REQUEST,
      maxTokens: 256,
    })
    expect(params).toEqual({ model: 'gpt-4o-mini', messages: REQUEST.messages, ...cap })
  })

  it.each([
    ['the configured temperature', { temperature: 0.4 }, {}, 0.4],
    [
      'the request temperature over the configured one',
      { temperature: 0.4 },
      { temperature: 0 },
      0,
    ],
  ])('sends %s', (_, endpoint, request, temperature) => {
    const params = toChatParams(buildChatEndpoint(endpoint), { ...REQUEST, ...request })
    expect(params.temperature).toBe(temperature)
  })

  it('omits temperature when neither the config nor the request sets it', () => {
    expect(toChatParams(buildChatEndpoint(), REQUEST)).not.toHaveProperty('temperature')
  })
})

describe('toFinishReason', () => {
  it.each([
    ['stop', 'stop'],
    ['length', 'length'],
    ['content_filter', 'content_filter'],
    ['tool_calls', 'unknown'],
    ['function_call', 'unknown'],
    ['eos', 'unknown'],
    ['constructor', 'unknown'],
    [null, 'unknown'],
    [undefined, 'unknown'],
  ] satisfies [string | null | undefined, FinishReason][])('maps %s to %s', (reason, expected) => {
    expect(toFinishReason(reason)).toBe(expected)
  })
})

describe('toTokenUsage', () => {
  it('maps chat usage', () => {
    expect(toTokenUsage(USAGE)).toEqual({ promptTokens: 12, completionTokens: 5, totalTokens: 17 })
  })

  it('reports zero completion tokens for embedding usage', () => {
    expect(toTokenUsage({ prompt_tokens: 8, total_tokens: 8 })).toEqual({
      promptTokens: 8,
      completionTokens: 0,
      totalTokens: 8,
    })
  })
})

describe('toChatCompletion', () => {
  it('maps text, finish reason, usage and the served model', () => {
    expect(toChatCompletion(buildCompletion('Hi there'), 'gpt-4o-mini')).toEqual({
      text: 'Hi there',
      finishReason: 'stop',
      usage: { promptTokens: 12, completionTokens: 5, totalTokens: 17 },
      model: SERVED_CHAT_MODEL,
    })
  })

  it('falls back to the configured model and tolerates missing parts', () => {
    const response = buildCompletion(null, { model: '', choices: [], usage: undefined })
    expect(toChatCompletion(response, 'gpt-4o-mini')).toEqual({
      text: '',
      finishReason: 'unknown',
      model: 'gpt-4o-mini',
    })
  })
})

describe('toEmbeddingParams', () => {
  it('always asks for floats and copies the input', () => {
    const texts = ['alpha', 'beta']
    const params = toEmbeddingParams(buildEmbeddingEndpoint(), texts)
    expect(params).toEqual({
      model: 'text-embedding-3-small',
      input: texts,
      encoding_format: 'float',
    })
    expect(params.input).not.toBe(texts)
  })

  it.each([
    ['configured and accepted', { dimensions: 512, supportsEmbeddingDimensions: true }, 512],
    [
      'configured but not accepted',
      { dimensions: 768, supportsEmbeddingDimensions: false },
      undefined,
    ],
    ['accepted but not configured', { supportsEmbeddingDimensions: true }, undefined],
  ])('sends dimensions only when %s', (_, endpoint, dimensions) => {
    expect(toEmbeddingParams(buildEmbeddingEndpoint(endpoint), ['alpha']).dimensions).toBe(
      dimensions
    )
  })
})
