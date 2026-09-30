import { describe, expect, it } from 'vitest'

import { getListView } from '@/features/documents/lib/get-list-view'

const loaded = { hasData: true, isError: false, loaded: 5, shown: 5 }

describe('getListView', () => {
  it('shows the skeleton until the first response, and the error state when it fails', () => {
    expect(getListView({ hasData: false, isError: false, loaded: 0, shown: 0 })).toBe('loading')
    expect(getListView({ hasData: false, isError: true, loaded: 0, shown: 0 })).toBe('error')
  })

  it('keeps showing loaded documents when a background refetch fails', () => {
    expect(getListView({ ...loaded, isError: true })).toBe('results')
  })

  it('tells an empty library apart from a filter without matches', () => {
    expect(getListView({ ...loaded, loaded: 0, shown: 0 })).toBe('empty')
    expect(getListView({ ...loaded, shown: 0 })).toBe('noMatches')
    expect(getListView(loaded)).toBe('results')
  })
})
