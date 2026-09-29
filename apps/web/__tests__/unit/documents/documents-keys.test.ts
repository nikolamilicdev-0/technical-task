import { describe, expect, it } from 'vitest'

import { documentsKeys } from '@/features/documents/lib/documents-keys'

describe('documentsKeys', () => {
  it('nests list keys under lists(), so one invalidation reaches every list', () => {
    const list = documentsKeys.list({ limit: 200 })
    expect(list).toEqual(['documents', 'list', { limit: 200 }])
    expect(list.slice(0, 2)).toEqual(documentsKeys.lists())
  })

  it('nests detail keys under details() and everything under all', () => {
    const detail = documentsKeys.detail('doc-1')
    expect(detail).toEqual(['documents', 'detail', 'doc-1'])
    expect(detail.slice(0, 2)).toEqual(documentsKeys.details())
    expect(documentsKeys.lists()[0]).toBe(documentsKeys.all[0])
  })
})
