import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDocument, DOCUMENT_ID, UPDATED_AT } from '@/__tests__/fixtures/documents'
import { renderWithProviders } from '@/__tests__/helpers/render'
import { DocumentStatusBar } from '@/features/documents/components/DocumentStatusBar'
import { documentsService } from '@/features/documents/services/documents-service'
import en from '@/messages/en.json'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/documents/services/documents-service', () => ({
  documentsService: { reindex: vi.fn() },
}))

const { statusBar } = en.documents
const NOW = Date.parse(UPDATED_AT)
const FIVE_MINUTES_MS = 5 * 60_000

function renderBar(overrides: Parameters<typeof buildDocument>[0]) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <DocumentStatusBar document={buildDocument(overrides)} now={NOW} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(documentsService.reindex).mockResolvedValue({ queued: 1 })
})

describe('DocumentStatusBar', () => {
  it('counts the passages of an indexed document and offers no retry', () => {
    renderBar({ embeddingStatus: 'ready', chunkCount: 4 })
    expect(screen.getByRole('status')).toHaveTextContent(
      'Indexed as 4 passages. Chat answers can cite it.'
    )
    expect(screen.queryByRole('button', { name: statusBar.reindex })).not.toBeInTheDocument()
  })

  it('explains a failure and when it will be retried', () => {
    renderBar({
      embeddingStatus: 'failed',
      embeddingError: 'The provider rejected the key.',
      nextAttemptAt: new Date(NOW + FIVE_MINUTES_MS).toISOString(),
    })
    expect(screen.getByRole('status')).toHaveTextContent(statusBar.failed)
    expect(screen.getByText('The provider rejected the key.')).toBeInTheDocument()
    expect(screen.getByText('Retrying automatically in 5 minutes.')).toBeInTheDocument()
  })

  it('queues the document again and moves focus to the status it updates', async () => {
    renderBar({ embeddingStatus: 'failed', embeddingError: 'Timeout' })
    await userEvent.click(screen.getByRole('button', { name: statusBar.reindex }))
    expect(documentsService.reindex).toHaveBeenCalledWith(DOCUMENT_ID)
    expect(screen.getByRole('region', { name: statusBar.label })).toHaveFocus()
  })
})
