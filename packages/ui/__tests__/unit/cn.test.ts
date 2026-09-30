import { describe, expect, it } from 'vitest'

import { cn } from '../../src/lib/cn'

describe('cn', () => {
  it('joins class names and drops falsy values', () => {
    expect(cn('flex', false, null, undefined, 'gap-2', ['items-center'])).toBe(
      'flex gap-2 items-center'
    )
  })

  it('lets the last conflicting utility win', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('bg-primary', 'bg-surface-container-high')).toBe('bg-surface-container-high')
  })

  it('treats the custom `text-code` size as a font size, not a colour', () => {
    expect(cn('text-code', 'text-primary')).toBe('text-code text-primary')
    expect(cn('text-sm', 'text-code')).toBe('text-code')
  })

  it('resolves display conflicts between base and override classes', () => {
    expect(cn('flex', 'hidden md:flex')).toBe('hidden md:flex')
  })
})
