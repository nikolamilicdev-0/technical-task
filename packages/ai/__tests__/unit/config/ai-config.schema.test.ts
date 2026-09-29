import { aiConfigSchema } from '@kb/ai'
import { describe, expect, it } from 'vitest'

function issuePaths(input: unknown): string[] {
  const result = aiConfigSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('aiConfigSchema', () => {
  it('reports every profile gap at once, under nested config paths', () => {
    expect(issuePaths({ chat: { provider: 'custom' }, embedding: {}, app: {} })).toEqual([
      'chat.baseUrl',
      'chat.model',
      'embedding.model',
    ])
  })

  it('reports a connection gap shared with chat only once, on the chat side', () => {
    const input = { chat: { provider: 'together' }, embedding: { provider: 'together' }, app: {} }
    expect(issuePaths(input)).toEqual(['chat.apiKey'])
  })

  it('checks the embedding connection on its own when the providers differ', () => {
    const input = { chat: { apiKey: 'sk' }, embedding: { provider: 'custom' }, app: {} }
    expect(issuePaths(input)).toEqual(['embedding.baseUrl', 'embedding.model'])
  })

  it('checks nothing else about an embedding provider that cannot embed', () => {
    const input = { chat: { provider: 'groq' }, embedding: {}, app: {} }
    expect(issuePaths(input)).toEqual(['chat.apiKey', 'embedding.provider'])
  })

  it('always resolves the embedding provider', () => {
    const config = aiConfigSchema.parse({ chat: { provider: 'ollama' }, embedding: {}, app: {} })
    expect(config.embedding.provider).toBe('ollama')
  })

  it.each([
    ['an empty API key', { chat: { apiKey: '' } }, 'chat.apiKey'],
    ['an empty model name', { chat: { apiKey: 'sk', model: '' } }, 'chat.model'],
    [
      'a header with an empty name',
      { chat: { apiKey: 'sk', headers: { '': 'x' } } },
      'chat.headers.',
    ],
  ])('rejects %s', (_, sections, path) => {
    expect(issuePaths({ embedding: {}, app: {}, ...sections })).toEqual([path])
  })
})
