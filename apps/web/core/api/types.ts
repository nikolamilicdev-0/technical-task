import type { ErrorCode } from '@kb/contracts'
import type { z } from 'zod'

/** Error copy (`messages/en.json` → `errors`); codes without copy fall back to the server text. */
export interface ErrorMessages {
  network: string
  unknown: string
  rateLimitedRetry: string
  codes: Readonly<Partial<Record<ErrorCode, string>>>
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type QueryValue = string | number | boolean | null | undefined

export type QueryParams = Readonly<Record<string, QueryValue | readonly QueryValue[]>>

export interface RequestOptions<TData> {
  method?: HttpMethod
  /** Serialised as JSON. */
  body?: unknown
  query?: QueryParams
  /** Validates the response; without it the JSON is trusted as `TData`. */
  schema?: z.ZodType<TData>
  signal?: AbortSignal
}

export interface StreamOptions {
  body: unknown
  signal?: AbortSignal
}

export interface UploadOptions<TData> {
  formData: FormData
  schema?: z.ZodType<TData>
  signal?: AbortSignal
  /** Upload progress as a 0–1 fraction. */
  onProgress?: (fraction: number) => void
}

export interface ApiClient {
  request<TData>(path: string, options?: RequestOptions<TData>): Promise<TData>
  /** POSTs with `Accept: text/event-stream` and returns the open response for the SSE reader. */
  stream(path: string, options: StreamOptions): Promise<Response>
  upload<TData>(path: string, options: UploadOptions<TData>): Promise<TData>
}

export interface ApiClientConfig {
  /** API origin without the `/api` prefix, e.g. `http://localhost:4000`. */
  baseUrl: string
  getAccessToken: () => Promise<string | null>
  /** Called once on a 401; resolve true when a fresh token is available so the call is retried. */
  onUnauthorized?: () => Promise<boolean>
  fetch?: typeof fetch
}

export interface XhrUploadRequest {
  url: string
  formData: FormData
  token: string | null
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}

export interface XhrUploadResult {
  status: number
  body: unknown
  retryAfter: string | null
}
