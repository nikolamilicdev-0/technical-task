import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Grid } from '../../src/components/Grid'
import { GridItem } from '../../src/components/GridItem'

describe('Grid', () => {
  it('renders a grid with responsive columns and a gap', () => {
    render(<Grid data-testid="grid" columns={{ base: 1, sm: 2, xl: 4 }} gap="lg" />)
    expect(screen.getByTestId('grid')).toHaveClass(
      'grid',
      'grid-cols-1',
      'sm:grid-cols-2',
      'xl:grid-cols-4',
      'gap-6'
    )
  })

  it('renders list semantics when asked', () => {
    render(
      <Grid as="ul" columns={3}>
        <GridItem as="li">One</GridItem>
      </Grid>
    )
    expect(screen.getByRole('list')).toHaveClass('grid-cols-3')
    expect(screen.getByRole('listitem')).toHaveTextContent('One')
  })
})

describe('GridItem', () => {
  it('spans columns per breakpoint', () => {
    render(<GridItem data-testid="item" colSpan={{ base: 'full', md: 6 }} />)
    expect(screen.getByTestId('item')).toHaveClass('col-span-full', 'md:col-span-6')
  })

  it('adds no span classes by default', () => {
    render(<GridItem data-testid="item" />)
    expect(screen.getByTestId('item').className).toBe('')
  })
})
