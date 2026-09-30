import { apiRoutes, usageSummarySchema } from '@kb/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildUsageSummary } from '@/__tests__/fixtures/usage'
import { ApiError } from '@/core/api/api-error'
import type { ApiClient, RequestOptions } from '@/core/api/types'
import { useUsageSummary } from '@/features/usage/hooks/useUsageSummary'
import { usageKeys } from '@/features/usage/lib/usage-keys'

type Request = (path: string, options?: RequestOptions<unknown>) => Promise<unknown>

const client = vi.hoisted(() => ({ request: vi.fn<Request>(), stream: vi.fn(), upload: vi.fn() }))
vi.mock('@/core/api/browser-client', () => ({
  getApiClient: () => client as unknown as ApiClient,
}))

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useUsageSummary', () => {
  it('asks the API for the last 30 days in the viewer’s time zone and validates the reply', async () => {
    const summary = buildUsageSummary()
    client.request.mockResolvedValue(summary)
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useUsageSummary(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(summary))
    const [path, options] = client.request.mock.calls[0] ?? []
    expect(path).toBe(apiRoutes.usage.summary)
    expect(options?.schema).toBe(usageSummarySchema)
    expect(options?.signal).toBeInstanceOf(AbortSignal)
    expect(options?.query?.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(Date.parse(String(options?.query?.from))).toBeLessThan(Date.now())
    expect(queryClient.getQueryData(usageKeys.summary(30))).toEqual(summary)
  })

  it('serves a remount from the cache for a minute instead of asking again', async () => {
    client.request.mockResolvedValue(buildUsageSummary())
    const { wrapper } = setup()
    const first = renderHook(() => useUsageSummary(), { wrapper })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    first.unmount()

    const second = renderHook(() => useUsageSummary(), { wrapper })
    expect(second.result.current.isSuccess).toBe(true)
    expect(client.request).toHaveBeenCalledOnce()
  })

  it('surfaces a failed request as the query error', async () => {
    const failure = new ApiError({ status: 503, code: 'internal_error' })
    client.request.mockRejectedValue(failure)
    const { wrapper } = setup()
    const { result } = renderHook(() => useUsageSummary(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(failure)
  })
})
