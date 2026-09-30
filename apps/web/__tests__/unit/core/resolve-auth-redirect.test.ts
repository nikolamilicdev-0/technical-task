import { describe, expect, it } from 'vitest'

import {
  buildLoginPath,
  getSafeNextPath,
  resolveAuthRedirect,
} from '@/core/auth/resolve-auth-redirect'

const signedOut = (pathname: string, search = '') =>
  resolveAuthRedirect({ pathname, search, isAuthenticated: false })
const signedIn = (pathname: string, search = '') =>
  resolveAuthRedirect({ pathname, search, isAuthenticated: true })

describe('resolveAuthRedirect', () => {
  it('sends signed-out visitors of the home page to login', () => {
    expect(signedOut('/')).toBe('/login')
  })

  it('sends signed-out visitors of protected pages to login with a return path', () => {
    expect(signedOut('/documents')).toBe('/login?next=%2Fdocuments')
    expect(signedOut('/chat/42', '?focus=1')).toBe('/login?next=%2Fchat%2F42%3Ffocus%3D1')
    expect(signedOut('/usage')).toBe('/login?next=%2Fusage')
  })

  it('lets signed-out visitors reach auth pages and unknown paths', () => {
    expect(signedOut('/login')).toBeNull()
    expect(signedOut('/signup')).toBeNull()
    expect(signedOut('/nowhere')).toBeNull()
  })

  it('does not treat look-alike prefixes as protected', () => {
    expect(signedOut('/documentsx')).toBeNull()
    expect(signedOut('/chats')).toBeNull()
  })

  it('sends signed-in users from home and auth pages to the documents', () => {
    expect(signedIn('/')).toBe('/documents')
    expect(signedIn('/login')).toBe('/documents')
    expect(signedIn('/signup')).toBe('/documents')
  })

  it('honours a safe return path when a signed-in user opens the login page', () => {
    expect(signedIn('/login', '?next=%2Fchat%2F42')).toBe('/chat/42')
    expect(signedIn('/login', '?next=https%3A%2F%2Fevil.example')).toBe('/documents')
  })

  it('lets signed-in users through protected and unknown pages', () => {
    expect(signedIn('/documents/7')).toBeNull()
    expect(signedIn('/nowhere')).toBeNull()
  })
})

describe('getSafeNextPath', () => {
  it.each([
    ['nothing', null],
    ['an empty string', ''],
    ['another origin', 'https://evil.example/documents'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash host', '/\\evil.example'],
    ['a tab-smuggled host', '/\t/evil.example'],
    ['a relative path', 'documents'],
    ['the login page', '/login'],
    ['the sign-up page', '/signup?next=/usage'],
  ])('falls back to the documents for %s', (_label, next) => {
    expect(getSafeNextPath(next)).toBe('/documents')
  })

  it('keeps same-site paths with their query and hash', () => {
    expect(getSafeNextPath('/chat/42?focus=1#message-3')).toBe('/chat/42?focus=1#message-3')
  })
})

describe('buildLoginPath', () => {
  it('returns the bare login path without parameters', () => {
    expect(buildLoginPath()).toBe('/login')
  })

  it('encodes the return path and the reason', () => {
    expect(buildLoginPath({ next: '/usage?days=30', reason: 'expired' })).toBe(
      '/login?next=%2Fusage%3Fdays%3D30&reason=expired'
    )
  })
})
