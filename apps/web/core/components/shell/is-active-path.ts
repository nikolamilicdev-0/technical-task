import { routes } from '@/core/config/routes'
import { isPathWithin } from '@/core/utils/paths'

/** A nav entry is current on its own page and on every page nested under it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === routes.home) return pathname === routes.home
  return isPathWithin(pathname, href)
}
