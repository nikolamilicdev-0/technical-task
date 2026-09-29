import { describe, expect, it } from 'vitest'

import { PROVIDER_IDS } from '../../../src/providers/provider-ids.js'
import { PROVIDER_PROFILES } from '../../../src/providers/provider-profiles.js'

const PROFILES = Object.values(PROVIDER_PROFILES)
const HOSTED_PROVIDERS = ['openai', 'groq', 'together', 'openrouter']
const BASE_URL_WITHOUT_TRAILING_SLASH = /^https?:\/\/.+[^/]$/

describe('PROVIDER_PROFILES', () => {
  it('has one profile per provider id, keyed by its own id', () => {
    expect(Object.keys(PROVIDER_PROFILES)).toEqual([...PROVIDER_IDS])
    for (const id of PROVIDER_IDS) expect(PROVIDER_PROFILES[id].id).toBe(id)
  })

  it.each([
    ['openai', true, true, 'max_completion_tokens'],
    ['groq', false, false, 'max_tokens'],
    ['together', true, false, 'max_tokens'],
    ['openrouter', true, false, 'max_tokens'],
    ['ollama', true, false, 'max_tokens'],
    ['custom', true, false, 'max_tokens'],
  ] as const)(
    '%s: embeddings %s, dimensions param %s, caps with %s',
    (id, embeds, sizes, param) => {
      expect(PROVIDER_PROFILES[id]).toMatchObject({
        supportsEmbeddings: embeds,
        supportsEmbeddingDimensions: sizes,
        maxTokensParam: param,
      })
    }
  )

  it('requests streamed usage everywhere by default', () => {
    expect(PROFILES.every((profile) => profile.supportsStreamUsage)).toBe(true)
  })

  it('gives every provider but custom a base URL and a default chat model', () => {
    for (const profile of PROFILES.filter(({ id }) => id !== 'custom')) {
      expect(profile.defaultBaseUrl).toMatch(BASE_URL_WITHOUT_TRAILING_SLASH)
      expect(profile.defaultChatModel).toEqual(expect.any(String))
    }
    expect(PROVIDER_PROFILES.custom.defaultBaseUrl).toBeUndefined()
    expect(PROVIDER_PROFILES.custom.defaultChatModel).toBeUndefined()
  })

  it('names a default embedding model exactly where one can exist', () => {
    for (const profile of PROFILES) {
      const expectsDefault = profile.supportsEmbeddings && profile.id !== 'custom'
      expect(profile.defaultEmbeddingModel !== undefined).toBe(expectsDefault)
    }
  })

  it('never claims dimension support without embedding support', () => {
    for (const profile of PROFILES) {
      if (!profile.supportsEmbeddings) expect(profile.supportsEmbeddingDimensions).toBe(false)
    }
  })

  it('requires a key only from hosted providers; keyless ones carry a placeholder', () => {
    for (const profile of PROFILES) {
      expect(profile.requiresApiKey).toBe(HOSTED_PROVIDERS.includes(profile.id))
      if (!profile.requiresApiKey) expect(profile.placeholderApiKey).not.toBe('')
    }
  })

  it('sends attribution headers to OpenRouter only', () => {
    const attributed = PROFILES.filter((profile) => profile.attributionHeaders !== undefined)
    expect(attributed.map((profile) => profile.id)).toEqual(['openrouter'])
    expect(PROVIDER_PROFILES.openrouter.attributionHeaders).toEqual({
      appName: 'X-Title',
      appUrl: 'HTTP-Referer',
    })
  })
})
