import { API_PREFIX, ERROR_HTTP_STATUS, EVENT_STREAM_MEDIA_TYPE } from '@kb/contracts'
import type { z } from 'zod'

import { isAbortError } from '@/core/api/abort'
import { ApiError, networkError, parseErrorBody } from '@/core/api/api-error'
import { parseJsonSafely } from '@/core/api/json'
import type { ApiClient, ApiClientConfig, HttpMethod, QueryParams } from '@/core/api/types'
import { xhrUpload } from '@/core/api/upload'

const JSON_MEDIA_TYPE = 'application/json'
const UNAUTHORIZED_STATUS = ERROR_HTTP_STATUS.unauthenticated
const JSON_HEADERS = { Accept: JSON_MEDIA_TYPE }
const JSON_BODY_HEADERS = { ...JSON_HEADERS, 'Content-Type': JSON_MEDIA_TYPE }
const STREAM_HEADERS = { Accept: EVENT_STREAM_MEDIA_TYPE, 'Content-Type': JSON_MEDIA_TYPE }

interface SendInit {
  method: HttpMethod
  headers: Readonly<Record<string, string>>
  query?: QueryParams
  body?: string
  signal?: AbortSignal
}

function toQueryString(query: QueryParams | undefined): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value]
    values.forEach((item) => {
      if (item !== undefined && item !== null) params.append(key, String(item))
    })
  }
  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

function withBearer(headers: SendInit['headers'], token: string | null) {
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}

function validate<TData>(body: unknown, schema: z.ZodType<TData> | undefined, status: number) {
  if (!schema) return body as TData
  const result = schema.safeParse(body)
  if (!result.success) throw new ApiError({ status, code: 'internal_error' })
  return result.data
}

/** Typed JSON client for the Nest API: Bearer auth, contracts errors, one retry after a 401. */
export function createApiClient({
  baseUrl,
  getAccessToken,
  onUnauthorized,
  fetch: fetchImpl = (input, init) => fetch(input, init),
}: ApiClientConfig): ApiClient {
  const buildUrl = (path: string, query?: QueryParams): string =>
    `${baseUrl}${API_PREFIX}${path}${toQueryString(query)}`

  // Runs a call with the current token; on 401 refreshes once and replays it with the new token.
  async function withSession<TResult extends { status: number }>(
    run: (token: string | null) => Promise<TResult>
  ): Promise<TResult> {
    const first = await run(await getAccessToken())
    if (first.status !== UNAUTHORIZED_STATUS || !onUnauthorized) return first
    if (!(await onUnauthorized())) return first
    return run(await getAccessToken())
  }

  async function send(path: string, init: SendInit): Promise<Response> {
    const response = await withSession(async (token) => {
      try {
        return await fetchImpl(buildUrl(path, init.query), {
          method: init.method,
          headers: withBearer(init.headers, token),
          body: init.body,
          signal: init.signal,
        })
      } catch (error) {
        // Aborts reject with the signal's reason; any other failure never reached the server.
        if (init.signal?.aborted || isAbortError(error)) throw error
        throw networkError()
      }
    })
    if (!response.ok) {
      throw parseErrorBody(
        response.status,
        parseJsonSafely(await response.text()),
        response.headers.get('Retry-After')
      )
    }
    return response
  }

  return {
    async request(path, { method = 'GET', body, query, schema, signal } = {}) {
      const hasBody = body !== undefined
      const response = await send(path, {
        method,
        query,
        signal,
        headers: hasBody ? JSON_BODY_HEADERS : JSON_HEADERS,
        body: hasBody ? JSON.stringify(body) : undefined,
      })
      return validate(parseJsonSafely(await response.text()), schema, response.status)
    },

    stream(path, { body, signal }) {
      return send(path, {
        method: 'POST',
        headers: STREAM_HEADERS,
        body: JSON.stringify(body),
        signal,
      })
    },

    async upload(path, { formData, schema, signal, onProgress }) {
      const result = await withSession((token) =>
        xhrUpload({ url: buildUrl(path), formData, token, signal, onProgress })
      )
      if (!isSuccessStatus(result.status)) {
        throw parseErrorBody(result.status, result.body, result.retryAfter)
      }
      return validate(result.body, schema, result.status)
    },
  }
}
