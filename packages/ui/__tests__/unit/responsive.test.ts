import { describe, expect, it } from 'vitest'

import {
  FLEX_DIRECTION_CLASSES,
  GRID_COLUMN_CLASSES,
  GRID_SPAN_CLASSES,
  responsiveClasses,
} from '../../src/lib/responsive'

describe('responsiveClasses', () => {
  it('returns nothing when the prop is not set', () => {
    expect(responsiveClasses(undefined, FLEX_DIRECTION_CLASSES)).toEqual([])
  })

  it('maps a single value to the unprefixed class', () => {
    expect(responsiveClasses('column', FLEX_DIRECTION_CLASSES)).toEqual(['flex-col'])
    expect(responsiveClasses(3, GRID_COLUMN_CLASSES)).toEqual(['grid-cols-3'])
  })

  it('emits breakpoint classes mobile-first whatever the key order', () => {
    expect(responsiveClasses({ lg: 4, base: 1, md: 2 }, GRID_COLUMN_CLASSES)).toEqual([
      'grid-cols-1',
      'md:grid-cols-2',
      'lg:grid-cols-4',
    ])
  })

  it('skips breakpoints that are not specified', () => {
    expect(responsiveClasses({ md: 'row' }, FLEX_DIRECTION_CLASSES)).toEqual(['md:flex-row'])
  })

  it('supports the full-width span', () => {
    expect(responsiveClasses({ base: 'full', sm: 6 }, GRID_SPAN_CLASSES)).toEqual([
      'col-span-full',
      'sm:col-span-6',
    ])
  })

  it('spells out every class with its own breakpoint prefix', () => {
    for (const [breakpoint, classes] of Object.entries(GRID_COLUMN_CLASSES)) {
      const prefix = breakpoint === 'base' ? '' : `${breakpoint}:`
      for (const className of Object.values(classes)) {
        expect(className.startsWith(`${prefix}grid-cols-`)).toBe(true)
      }
    }
  })
})
