import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ErrorState } from '@/core/components/states/ErrorState'
import { TranslationProvider } from '@/core/i18n/TranslationProvider'
import en from '@/messages/en.json'

function renderWithCopy(ui: ReactNode) {
  return render(<TranslationProvider dictionary={en}>{ui}</TranslationProvider>)
}

describe('ErrorState', () => {
  it('shows the generic copy by default', () => {
    renderWithCopy(<ErrorState />)
    expect(screen.getByRole('heading', { name: en.states.error.title })).toBeInTheDocument()
    expect(screen.getByText(en.states.error.description)).toBeInTheDocument()
  })

  it('shows the copy it is given', () => {
    renderWithCopy(<ErrorState title="Documents didn't load" description="Check the API." />)
    expect(screen.getByRole('heading', { name: "Documents didn't load" })).toBeInTheDocument()
    expect(screen.getByText('Check the API.')).toBeInTheDocument()
  })

  it('retries when the button is pressed', async () => {
    const onRetry = vi.fn()
    renderWithCopy(<ErrorState onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: en.common.retry }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('offers no retry without a handler', () => {
    renderWithCopy(<ErrorState />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('can title the whole page', () => {
    renderWithCopy(<ErrorState titleAs="h1" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.states.error.title)
  })
})
