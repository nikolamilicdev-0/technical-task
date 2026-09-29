// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ApiError } from '@/core/api/api-error'
import { createApiClient } from '@/core/api/client'
import type { ApiClientConfig } from '@/core/api/types'

const BASE_URL = 'http://api.test'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
}

function setup(responses: (Response | Error)[], overrides: Partial<ApiClientConfig> = {}) {
  const queue = [...responses]
  const fetch = vi.fn<typeof globalThis.fetch>(() => {
    const next = queue.shift()
    if (!next) throw new Error('Unexpected request')
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
  })
  const tokens = ['token-1', 'token-2']
  const getAccessToken = vi.fn(() => Promise.resolve(tokens.shift() ?? null))
  const client = createApiClient({ baseUrl: BASE_URL, getAccessToken, fetch, ...overrides })
  const headersOf = (call: number) => new Headers(fetch.mock.calls[call]?.[1]?.headers)
  return { client, fetch, headersOf }
}

describe('createApiClient', () => {
  it('calls the prefixed route with the bearer token and query string', async () => {
    const { client, fetch, headersOf } = setup([jsonResponse({ items: [] })])
    await client.request('/documents', { query: { limit: 20, tag: ['a', 'b'], search: undefined } })
    expect(fetch.mock.calls[0]?.[0]).toBe(`${BASE_URL}/api/documents?limit=20&tag=a&tag=b`)
    expect(headersOf(0).get('Authorization')).toBe('Bearer token-1')
    expect(headersOf(0).get('Content-Type')).toBeNull()
  })

  it('sends JSON bodies and validates the response with a schema', async () => {
    const { client, fetch, headersOf } = setup([jsonResponse({ id: 'doc-1', extra: true })])
    const result = await client.request('/documents', {
      method: 'POST',
      body: { title: 'Notes' },
      schema: z.object({ id: z.string() }),
    })
    expect(result).toEqual({ id: 'doc-1' })
    expect(fetch.mock.calls[0]?.[1]?.body).toBe('{"title":"Notes"}')
    expect(headersOf(0).get('Content-Type')).toBe('application/json')
  })

  it('rejects responses that break the contract', async () => {
    const { client } = setup([jsonResponse({ id: 42 })])
    const request = client.request('/documents/1', { schema: z.object({ id: z.string() }) })
    await expect(request).rejects.toMatchObject({ code: 'internal_error', status: 200 })
  })

  it('returns undefined for empty responses', async () => {
    const { client } = setup([new Response(null, { status: 204 })])
    await expect(client.request('/documents/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('turns error bodies into ApiErrors', async () => {
    const { client } = setup([
      jsonResponse(
        { code: 'rate_limited', messages: ['Slow down'] },
        { status: 429, headers: { 'Retry-After': '17' } }
      ),
    ])
    const error: unknown = await client.request('/usage/summary').catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 429, code: 'rate_limited', retryAfter: 17 })
  })

  it('refreshes once after a 401 and replays the call with the new token', async () => {
    const onUnauthorized = vi.fn(() => Promise.resolve(true))
    const { client, fetch, headersOf } = setup(
      [jsonResponse({ code: 'unauthenticated', messages: [] }, { status: 401 }), jsonResponse([])],
      { onUnauthorized }
    )
    await expect(client.request('/conversations')).resolves.toEqual([])
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(headersOf(1).get('Authorization')).toBe('Bearer token-2')
  })

  it('surfaces the 401 when the session cannot be refreshed', async () => {
    const onUnauthorized = vi.fn(() => Promise.resolve(false))
    const { client, fetch } = setup(
      [jsonResponse({ code: 'unauthenticated', messages: ['Expired'] }, { status: 401 })],
      { onUnauthorized }
    )
    await expect(client.request('/documents')).rejects.toMatchObject({ code: 'unauthenticated' })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('reports unreachable servers as network errors', async () => {
    const { client } = setup([new TypeError('fetch failed')])
    await expect(client.request('/documents')).rejects.toMatchObject({ isNetworkError: true })
  })

  it('passes aborts through untouched', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    const { client } = setup([abort])
    await expect(client.request('/documents')).rejects.toBe(abort)
  })

  it('keeps a custom abort reason instead of reporting a network error', async () => {
    const controller = new AbortController()
    const reason = new Error('Navigated away')
    controller.abort(reason)
    const { client } = setup([reason])
    const request = client.request('/documents', { signal: controller.signal })
    await expect(request).rejects.toBe(reason)
  })

  it('opens SSE streams with the event-stream Accept header', async () => {
    const stream = new Response('event: done\ndata: {}\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    })
    const { client, headersOf } = setup([stream])
    const response = await client.stream('/conversations/1/messages', { body: { content: 'Hi' } })
    expect(response).toBe(stream)
    expect(headersOf(0).get('Accept')).toBe('text/event-stream')
  })
})
