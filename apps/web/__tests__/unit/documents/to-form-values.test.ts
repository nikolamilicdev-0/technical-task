import { describe, expect, it } from 'vitest'

import { buildDocument } from '@/__tests__/fixtures/documents'
import { haveSameFormValues, toFormValues } from '@/features/documents/lib/to-form-values'

describe('toFormValues', () => {
  it('takes the editable fields of a saved document', () => {
    const document = buildDocument({ title: 'Notes', content: '# Notes', tags: ['a', 'b'] })
    expect(toFormValues(document)).toEqual({ title: 'Notes', content: '# Notes', tags: ['a', 'b'] })
  })

  it('copies the tags, so editing them never touches the cached document', () => {
    const document = buildDocument({ tags: ['a'] })
    const values = toFormValues(document)
    expect(values.tags).not.toBe(document.tags)
  })
})

describe('haveSameFormValues', () => {
  const values = { title: 'Notes', content: '# Notes', tags: ['a', 'b'] }

  it('matches equal values held in different objects', () => {
    expect(haveSameFormValues(values, { ...values, tags: ['a', 'b'] })).toBe(true)
    expect(
      haveSameFormValues({ title: 'x', content: 'y' }, { title: 'x', content: 'y', tags: [] })
    ).toBe(true)
  })

  it('tells any changed field apart, including the order of tags', () => {
    expect(haveSameFormValues(values, { ...values, title: 'Notes v2' })).toBe(false)
    expect(haveSameFormValues(values, { ...values, content: '# Notes!' })).toBe(false)
    expect(haveSameFormValues(values, { ...values, tags: ['b', 'a'] })).toBe(false)
  })
})
