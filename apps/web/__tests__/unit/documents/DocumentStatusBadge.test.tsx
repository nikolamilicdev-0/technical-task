import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/__tests__/helpers/render'
import { DocumentStatusBadge } from '@/features/documents/components/DocumentStatusBadge'
import en from '@/messages/en.json'

// Radix positions tooltips with ResizeObserver, which jsdom does not implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const { status } = en.documents

describe('DocumentStatusBadge', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['pending', status.pending],
    ['processing', status.processing],
    ['ready', status.ready],
    ['failed', status.failed],
  ] as const)('labels %s documents', (embeddingStatus, label) => {
    renderWithProviders(<DocumentStatusBadge status={embeddingStatus} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('explains a failure in a tooltip that keyboard users can open', async () => {
    renderWithProviders(<DocumentStatusBadge status="failed" error="The API key was rejected." />)
    await userEvent.tab()
    expect(screen.getByText(status.failed)).toHaveFocus()
    expect(await screen.findByRole('tooltip')).toHaveTextContent('The API key was rejected.')
  })

  it('only offers a tooltip for failures with a reason', async () => {
    renderWithProviders(<DocumentStatusBadge status="ready" error="Stale error" />)
    await userEvent.tab()
    expect(document.body).toHaveFocus()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
