// @vitest-environment node
import { MAX_SCOPE_DOCUMENTS } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { activeScope, isScopeFull, toggleScope } from '@/features/chat/lib/scope'

const ids = (count: number) => Array.from({ length: count }, (_, index) => `doc-${index}`)

describe('toggleScope', () => {
  it('adds a checked document and removes an unchecked one', () => {
    expect(toggleScope(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleScope(['a', 'b'], 'a', false)).toEqual(['b'])
  })

  it('never adds a document twice or past the limit', () => {
    expect(toggleScope(['a'], 'a', true)).toEqual(['a'])
    const full = ids(MAX_SCOPE_DOCUMENTS)
    expect(toggleScope(full, 'extra', true)).toEqual(full)
    expect(isScopeFull(full)).toBe(true)
    expect(isScopeFull(ids(1))).toBe(false)
  })
})

describe('activeScope', () => {
  it('keeps only the picked documents that are still ready', () => {
    expect(activeScope(['a', 'gone', 'b'], new Set(['a', 'b', 'c']))).toEqual(['a', 'b'])
  })
})
