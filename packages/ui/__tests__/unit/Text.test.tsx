import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Text } from '../../src/components/Text'

describe('Text', () => {
  it.each([
    ['display', 'H1'],
    ['title', 'H1'],
    ['heading', 'H2'],
    ['subheading', 'H3'],
    ['body', 'P'],
    ['caption', 'SPAN'],
    ['label', 'SPAN'],
    ['code', 'CODE'],
  ] as const)('renders the %s variant as <%s>', (variant, tagName) => {
    render(<Text variant={variant}>Copy</Text>)
    expect(screen.getByText('Copy').tagName).toBe(tagName)
  })

  it('defaults to body copy in the default tone', () => {
    render(<Text>Copy</Text>)
    expect(screen.getByText('Copy')).toHaveClass('text-sm', 'text-on-surface')
  })

  it('lets `as` override the element without changing the style', () => {
    render(
      <Text variant="heading" as="h3">
        Section
      </Text>
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Section' })).toHaveClass('text-lg')
  })

  it('applies tone, alignment and truncation', () => {
    render(
      <Text tone="muted" align="end" truncate>
        Copy
      </Text>
    )
    expect(screen.getByText('Copy')).toHaveClass('text-on-surface-variant', 'text-end', 'truncate')
  })

  it('merges className so later utilities win', () => {
    render(<Text className="text-lg">Copy</Text>)
    const element = screen.getByText('Copy')
    expect(element).toHaveClass('text-lg')
    expect(element).not.toHaveClass('text-sm')
  })
})
