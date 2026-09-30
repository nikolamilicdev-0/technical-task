import { createApiClient } from '@/core/api/client'
import { getAccessToken } from '@/core/api/get-access-token'
import { refreshSessionOnce } from '@/core/api/handle-unauthorized'
import type { ApiClient } from '@/core/api/types'
import { getPublicEnv } from '@/core/config/env'

let apiClient: ApiClient | undefined

/** Created on first use, so `next build` never needs the env. */
export function getApiClient(): ApiClient {
  apiClient ??= createApiClient({
    baseUrl: getPublicEnv().apiUrl,
    getAccessToken,
    onUnauthorized: refreshSessionOnce,
  })
  return apiClient
}
