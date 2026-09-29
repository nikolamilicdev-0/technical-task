import { describe, expect, it } from 'vitest'

import { hasChanges, toUpdateInput } from '@/features/documents/lib/to-update-input'

const saved = { title: 'Notes', content: '# Notes', tags: ['a', 'b'] }

describe('toUpdateInput', () => {
  it('is empty when nothing changed', () => {
    const input = toUpdateInput({ ...saved, tags: ['a', 'b'] }, saved)
    expect(input).toEqual({})
    expect(hasChanges(input)).toBe(false)
  })

  it('sends only the fields that changed', () => {
    expect(toUpdateInput({ ...saved, title: 'Meeting notes' }, saved)).toEqual({
      title: 'Meeting notes',
    })
    expect(toUpdateInput({ ...saved, content: '# Changed' }, saved)).toEqual({
      content: '# Changed',
    })
  })

  it('sends the tags when a tag or their order changes', () => {
    expect(toUpdateInput({ ...saved, tags: ['a'] }, saved)).toEqual({ tags: ['a'] })
    expect(toUpdateInput({ ...saved, tags: ['b', 'a'] }, saved)).toEqual({ tags: ['b', 'a'] })
  })

  it('reports changes', () => {
    expect(hasChanges({ tags: [] })).toBe(true)
    expect(hasChanges({ title: undefined })).toBe(false)
  })
})
