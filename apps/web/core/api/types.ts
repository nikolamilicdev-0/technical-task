import type { ErrorCode } from '@kb/contracts'
import type { z } from 'zod'

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
  onProgress?: (fraction: number) => void
}

export interface ApiClient {
  request<TData>(path: string, options?: RequestOptions<TData>): Promise<TData>
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
