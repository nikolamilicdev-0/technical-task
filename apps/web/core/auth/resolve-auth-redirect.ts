import {
  AUTH_ROUTES,
  AUTH_SEARCH_PARAMS,
  DEFAULT_AUTHENTICATED_ROUTE,
  PROTECTED_PREFIXES,
  routes,
} from '@/core/config/routes'
import { isPathWithin } from '@/core/utils/paths'

// Any real origin works: it only lets the URL parser tell same-site paths from other hosts.
const PARSE_BASE = 'http://same-origin.invalid'

export interface AuthRedirectInput {
  pathname: string
  /** The raw query string including `?`, or an empty string. */
  search: string
  isAuthenticated: boolean
}

/** Where the proxy sends a request (a same-site path), or null to let it through. */
export function resolveAuthRedirect({
  pathname,
  search,
  isAuthenticated,
}: AuthRedirectInput): string | null {
  if (isAuthenticated) {
    if (pathname !== routes.home && !isAuthRoute(pathname)) return null
    return getSafeNextPath(new URLSearchParams(search).get(AUTH_SEARCH_PARAMS.next))
  }
  if (pathname === routes.home) return routes.login
  if (!isProtectedPath(pathname)) return null
  return buildLoginPath({ next: `${pathname}${search}` })
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => isPathWithin(pathname, prefix))
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.includes(pathname)
}

/** Login URL that returns the user to `next` afterwards and can explain why they landed there. */
export function buildLoginPath(params: { next?: string; reason?: string } = {}): string {
  const query = new URLSearchParams()
  if (params.next) query.set(AUTH_SEARCH_PARAMS.next, params.next)
  if (params.reason) query.set(AUTH_SEARCH_PARAMS.reason, params.reason)
  const queryString = query.toString()
  return queryString ? `${routes.login}?${queryString}` : routes.login
}

/**
 * Accepts only same-site paths, so `?next=` cannot become an open redirect; anything else
 * (other hosts, `//host`, `/\host`, auth pages) falls back to the default signed-in page.
 */
export function getSafeNextPath(next: string | null | undefined): string {
  if (!next?.startsWith('/')) return DEFAULT_AUTHENTICATED_ROUTE
  const url = new URL(next, PARSE_BASE)
  if (url.origin !== PARSE_BASE || isAuthRoute(url.pathname)) return DEFAULT_AUTHENTICATED_ROUTE
  return `${url.pathname}${url.search}${url.hash}`
}
