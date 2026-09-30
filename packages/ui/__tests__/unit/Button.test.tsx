import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '../../src/components/Button'

describe('Button', () => {
  it('renders a non-submitting primary button by default', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('bg-primary', 'text-on-primary', 'h-9')
  })

  it('applies variant, size and full-width classes', () => {
    render(
      <Button variant="outline" size="lg" fullWidth>
        Save
      </Button>
    )
    expect(screen.getByRole('button')).toHaveClass('border', 'h-11', 'w-full')
  })

  it('keeps the chip box regardless of size', () => {
    render(
      <Button variant="chip" size="lg" aria-pressed>
        Tag
      </Button>
    )
    const chip = screen.getByRole('button', { pressed: true })
    expect(chip).toHaveClass('h-8', 'px-3', 'rounded-full')
    expect(chip).not.toHaveClass('h-11')
  })

  it('calls onClick when activated', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('stays focusable but inert while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toBeEnabled()

    button.focus()
    await userEvent.keyboard('{Enter}')
    expect(onClick).not.toHaveBeenCalled()
    expect(button).toHaveFocus()
  })

  it('does not submit its form while loading', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading>
          Save
        </Button>
      </form>
    )
    screen.getByRole('button').focus()
    await userEvent.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders its child with button styling when asChild is set', () => {
    render(
      <Button asChild variant="link">
        <a href="/signup">Create an account</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: 'Create an account' })
    expect(link).toHaveAttribute('href', '/signup')
    expect(link).toHaveClass('text-primary')
  })
})
