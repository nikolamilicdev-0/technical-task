import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { buildDocument, DOCUMENT_ID } from '@/__tests__/fixtures/documents'
import { ApiError } from '@/core/api/api-error'
import { useDocument } from '@/features/documents/hooks/useDocument'
import { documentsKeys } from '@/features/documents/lib/documents-keys'
import { documentsService } from '@/features/documents/services/documents-service'

const POLL_MS = vi.hoisted(() => 10)

vi.mock('@/core/config/query', () => ({ INDEXING_POLL_INTERVAL_MS: POLL_MS }))
vi.mock('@/features/documents/services/documents-service', () => ({
  documentsService: { get: vi.fn() },
}))

const service = vi.mocked(documentsService)

describe('useDocument', () => {
  it('stops polling a document that is still indexing once a poll fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    queryClient.setQueryData(
      documentsKeys.detail(DOCUMENT_ID),
      buildDocument({ embeddingStatus: 'processing' })
    )
    service.get.mockRejectedValue(new ApiError({ status: 404, code: 'not_found' }))
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useDocument(DOCUMENT_ID), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, POLL_MS * 10))
    expect(service.get).toHaveBeenCalledOnce()
  })
})
