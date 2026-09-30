import { describe, expect, it } from 'vitest'

import { isActivePath } from '@/core/components/shell/is-active-path'

describe('isActivePath', () => {
  it('matches the section page itself', () => {
    expect(isActivePath('/documents', '/documents')).toBe(true)
  })

  it('matches pages nested under the section', () => {
    expect(isActivePath('/documents/42', '/documents')).toBe(true)
    expect(isActivePath('/chat/abc', '/chat')).toBe(true)
    expect(isActivePath('/documents/', '/documents')).toBe(true)
  })

  it('does not match look-alike prefixes or other sections', () => {
    expect(isActivePath('/documents-archive', '/documents')).toBe(false)
    expect(isActivePath('/usage', '/documents')).toBe(false)
  })

  it('only matches the home link on the home page', () => {
    expect(isActivePath('/', '/')).toBe(true)
    expect(isActivePath('/documents', '/')).toBe(false)
  })
})
