import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildCitation } from '@/__tests__/fixtures/chat'
import { renderWithProviders } from '@/__tests__/helpers/render'
import { MessageBubble } from '@/features/chat/components/MessageBubble'
import type { MessageItem } from '@/features/chat/types'
import en from '@/messages/en.json'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

// jsdom has no layout: Radix tooltips need ResizeObserver, revealing a source scrolls to it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const CITATIONS = [
  buildCitation({ index: 1, documentTitle: 'Onboarding guide', cited: true }),
  buildCitation({ index: 2, documentTitle: 'Billing FAQ', headingPath: 'Billing FAQ › Refunds' }),
]

function renderMessage(overrides: Partial<Omit<MessageItem, 'key'>> = {}) {
  const user = userEvent.setup()
  renderWithProviders(
    <ol>
      <MessageBubble
        author="assistant"
        content="Install the CLI first [1]."
        citations={CITATIONS}
        streaming={false}
        {...overrides}
      />
    </ol>
  )
  return { user }
}

const sourcesToggle = () => screen.getByRole('button', { name: /2 sources/ })
const sourceCards = () => {
  const list = document.getElementById(sourcesToggle().getAttribute('aria-controls') ?? '')
  return within(list ?? document.body).getAllByRole('listitem')
}

describe('MessageBubble', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders an in-range [n] marker as a chip that names its source', () => {
    renderMessage()
    expect(screen.getByRole('button', { name: 'Source 1: Onboarding guide' })).toHaveTextContent(
      '1'
    )
  })

  it('opens the sources and highlights the cited card when its chip is clicked', async () => {
    const { user } = renderMessage()
    expect(sourcesToggle()).toHaveAttribute('aria-expanded', 'false')

    await user.click(screen.getByRole('button', { name: 'Source 1: Onboarding guide' }))

    expect(sourcesToggle()).toHaveAttribute('aria-expanded', 'true')
    const [first, second] = sourceCards()
    expect(first).toHaveAttribute('aria-current', 'true')
    expect(first).toHaveFocus()
    expect(first).toHaveTextContent(en.chat.sources.citedBadge)
    expect(second).not.toHaveAttribute('aria-current')
    expect(second).toHaveTextContent('Refunds')
  })

  it('keeps a real Markdown link a link', () => {
    renderMessage({ content: 'See [1](http://x.example) for details.' })
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('href', 'http://x.example')
    expect(screen.queryByRole('button', { name: /Source 1/ })).not.toBeInTheDocument()
  })

  it('leaves a marker without a matching source as text', () => {
    renderMessage({ content: 'Unknown [9].' })
    expect(screen.getByText('Unknown [9].')).toBeInTheDocument()
  })

  it('says what happens before the first token arrives', () => {
    renderMessage({ content: '', streaming: true })
    expect(screen.getByText('Reading 2 sources…')).toBeInTheDocument()
  })

  it('notes an answer that was stopped early', () => {
    renderMessage({ finishReason: 'aborted' })
    expect(screen.getByText(en.chat.message.finish.aborted)).toBeInTheDocument()
  })

  it('shows a question as plain text, without Markdown', () => {
    renderMessage({ author: 'user', content: 'What is **this** [1]?', citations: [] })
    expect(screen.getByText('What is **this** [1]?')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
