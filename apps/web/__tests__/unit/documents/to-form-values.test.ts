import { describe, expect, it } from 'vitest'

import { buildDocument } from '@/__tests__/fixtures/documents'
import { toFormValues } from '@/features/documents/lib/to-form-values'

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
