import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Flex } from '../../src/components/Flex'

describe('Flex', () => {
  it('renders a flex div by default', () => {
    render(<Flex data-testid="flex" />)
    const element = screen.getByTestId('flex')
    expect(element.tagName).toBe('DIV')
    expect(element).toHaveClass('flex')
  })

  it('maps layout props to static utility classes', () => {
    render(
      <Flex data-testid="flex" direction="column" align="center" justify="between" gap="md" wrap />
    )
    expect(screen.getByTestId('flex')).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-between',
      'gap-4',
      'flex-wrap'
    )
  })

  it('supports responsive directions', () => {
    render(<Flex data-testid="flex" direction={{ base: 'column', md: 'row' }} />)
    expect(screen.getByTestId('flex')).toHaveClass('flex-col', 'md:flex-row')
  })

  it('renders the requested element with its own attributes', () => {
    render(<Flex as="nav" aria-label="Primary" />)
    expect(screen.getByRole('navigation', { name: 'Primary' })).toHaveClass('flex')
  })

  it('switches to inline-flex and lets className override props', () => {
    render(<Flex data-testid="flex" inline gap="sm" className="gap-3" />)
    const element = screen.getByTestId('flex')
    expect(element).toHaveClass('inline-flex', 'gap-3')
    expect(element).not.toHaveClass('flex', 'gap-2')
  })
})
