import type { Document, DocumentList } from '@kb/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildDocument,
  buildDocumentList,
  buildDocumentSummary,
  DOCUMENT_ID,
} from '@/__tests__/fixtures/documents'
import { ApiError } from '@/core/api/api-error'
import { TranslationProvider } from '@/core/i18n/TranslationProvider'
import { DOCUMENTS_LIST_PARAMS } from '@/features/documents/constants'
import {
  useCreateDocument,
  useDeleteDocument,
  useReindexDocument,
  useUpdateDocument,
} from '@/features/documents/hooks/useDocumentMutations'
import { documentsKeys } from '@/features/documents/lib/documents-keys'
import { documentsService } from '@/features/documents/services/documents-service'
import en from '@/messages/en.json'

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/documents/services/documents-service', () => ({
  documentsService: { create: vi.fn(), update: vi.fn(), remove: vi.fn(), reindex: vi.fn() },
}))

const service = vi.mocked(documentsService)
const detailKey = documentsKeys.detail(DOCUMENT_ID)
const listKey = documentsKeys.list(DOCUMENTS_LIST_PARAMS)
const rejected = new ApiError({ status: 500, code: 'internal_error' })

function deferred<TValue>() {
  let resolve: (value: TValue) => void = () => undefined
  let reject: (reason: unknown) => void = () => undefined
  const promise = new Promise<TValue>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const saved = buildDocument({ title: 'Notes', content: '# Notes', embeddingStatus: 'ready' })
  queryClient.setQueryData<Document>(detailKey, saved)
  queryClient.setQueryData<DocumentList>(
    listKey,
    buildDocumentList([buildDocumentSummary(), buildDocumentSummary({ id: 'other' })])
  )
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TranslationProvider dictionary={en}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TranslationProvider>
  )
  const detail = () => queryClient.getQueryData<Document>(detailKey)
  const listIds = () =>
    queryClient.getQueryData<DocumentList>(listKey)?.items.map((item) => item.id)
  return { queryClient, wrapper, saved, detail, listIds }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useUpdateDocument', () => {
  it('shows the edit at once and re-queues the text change, then takes the saved document', async () => {
    const { wrapper, saved, detail } = setup()
    const request = deferred<Document>()
    service.update.mockReturnValue(request.promise)
    const { result } = renderHook(() => useUpdateDocument(DOCUMENT_ID), { wrapper })

    act(() => result.current.mutate({ title: 'Meeting notes' }))
    await waitFor(() => expect(detail()?.title).toBe('Meeting notes'))
    expect(detail()?.embeddingStatus).toBe('pending')

    const response = { ...saved, title: 'Meeting notes', embeddingStatus: 'processing' as const }
    act(() => request.resolve(response))
    await waitFor(() => expect(detail()).toEqual(response))
  })

  it('rolls the cached document back when the API refuses the edit', async () => {
    const { wrapper, saved, detail } = setup()
    service.update.mockRejectedValue(rejected)
    const { result } = renderHook(() => useUpdateDocument(DOCUMENT_ID), { wrapper })

    await act(() => result.current.mutateAsync({ title: 'Rejected' }).catch(() => undefined))
    expect(detail()).toEqual(saved)
  })
})

describe('useDeleteDocument', () => {
  it('drops the document from the cached lists before the API answers', async () => {
    const { wrapper, listIds } = setup()
    const request = deferred<void>()
    service.remove.mockReturnValue(request.promise)
    const { result } = renderHook(() => useDeleteDocument(), { wrapper })

    act(() => result.current.mutate(DOCUMENT_ID))
    await waitFor(() => expect(listIds()).toEqual(['other']))
    act(() => request.resolve())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('puts the document back when the delete fails', async () => {
    const { wrapper, listIds } = setup()
    service.remove.mockRejectedValue(rejected)
    const { result } = renderHook(() => useDeleteDocument(), { wrapper })

    await act(() => result.current.mutateAsync(DOCUMENT_ID).catch(() => undefined))
    expect(listIds()).toEqual([DOCUMENT_ID, 'other'])
  })
})

describe('useReindexDocument', () => {
  it('marks the document queued everywhere, and restores its failure when the request fails', async () => {
    const { queryClient, wrapper, saved, detail } = setup()
    const failure = { embeddingStatus: 'failed' as const, embeddingError: 'Timeout' }
    const failed = { ...saved, ...failure }
    const failedList = buildDocumentList([buildDocumentSummary(failure)])
    queryClient.setQueryData(detailKey, failed)
    queryClient.setQueryData(listKey, failedList)
    const listed = () => queryClient.getQueryData<DocumentList>(listKey)?.items[0]
    const request = deferred<{ queued: number }>()
    service.reindex.mockReturnValue(request.promise)
    const { result } = renderHook(() => useReindexDocument(DOCUMENT_ID), { wrapper })

    act(() => result.current.mutate())
    await waitFor(() => expect(detail()?.embeddingStatus).toBe('pending'))
    expect(detail()?.embeddingError).toBeNull()
    expect(listed()?.embeddingStatus).toBe('pending')

    act(() => request.reject(rejected))
    await waitFor(() => expect(detail()).toEqual(failed))
    expect(queryClient.getQueryData(listKey)).toEqual(failedList)
  })
})

describe('useCreateDocument', () => {
  it('caches the new document and replaces the form page with its editor', async () => {
    const { queryClient, wrapper } = setup()
    const created = buildDocument({ id: 'created', title: 'Fresh' })
    service.create.mockResolvedValue(created)
    const { result } = renderHook(() => useCreateDocument(), { wrapper })

    await act(() => result.current.mutateAsync({ title: 'Fresh', content: '# Fresh', tags: [] }))
    expect(queryClient.getQueryData(documentsKeys.detail('created'))).toEqual(created)
    expect(router.replace).toHaveBeenCalledWith('/documents/created')
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
  })
})
