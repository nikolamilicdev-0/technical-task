import { isServer, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { isApiError, isRetryableError } from '@/core/api/api-error'
import { handleUnauthorized } from '@/core/api/handle-unauthorized'
import { RETRY_COUNT, STALE_TIME_MS } from '@/core/config/query'

// The client already refreshed once before surfacing a 401, so the session is really gone.
function onRequestError(error: unknown): void {
  if (isApiError(error) && error.code === 'unauthenticated') void handleUnauthorized()
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < RETRY_COUNT && isRetryableError(error)
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: onRequestError }),
    mutationCache: new MutationCache({ onError: onRequestError }),
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, retry: shouldRetry },
      mutations: { retry: false },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/** A fresh client for every server render, one shared client in the browser. */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
