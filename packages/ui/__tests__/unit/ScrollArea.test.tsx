import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ScrollArea } from '../../src/components/ScrollArea'

describe('ScrollArea', () => {
  it('turns a labelled viewport into a named region keyboard users can focus', async () => {
    render(
      <ScrollArea viewportLabel="Conversation">
        <p>Only text, nothing focusable</p>
      </ScrollArea>
    )
    const viewport = screen.getByRole('region', { name: 'Conversation' })
    expect(viewport).toHaveAttribute('tabindex', '0')
    await userEvent.tab()
    expect(viewport).toHaveFocus()
  })

  it('leaves an unlabelled viewport out of the tab order', () => {
    render(
      <ScrollArea>
        <p>Content</p>
      </ScrollArea>
    )
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.getByText('Content').closest('[tabindex]')).toBeNull()
  })
})
