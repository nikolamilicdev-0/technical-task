import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { Button } from '../../src/components/Button'
import { Dialog } from '../../src/components/Dialog'

/** A dialog opened from state, the way pages open one from a button outside it. */
function Harness({ onCloseAutoFocus }: { onCloseAutoFocus?: (event: Event) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Upload file</Button>
      <Button>Elsewhere</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Upload a file"
        closeLabel="Close"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <p>Pick a file.</p>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('returns focus to the button that opened it when it has no trigger', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Upload file' })
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'Upload a file' })).toContainElement(
      document.activeElement as HTMLElement
    )

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('leaves focus to a close handler that places it itself', async () => {
    const user = userEvent.setup()
    const focusElsewhere = (event: Event) => {
      event.preventDefault()
      screen.getByRole('button', { name: 'Elsewhere' }).focus()
    }
    render(<Harness onCloseAutoFocus={focusElsewhere} />)
    await user.click(screen.getByRole('button', { name: 'Upload file' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
  })
})
