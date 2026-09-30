import { routes } from '@/core/config/routes'
import { isPathWithin } from '@/core/utils/paths'

export function isActivePath(pathname: string, href: string): boolean {
  if (href === routes.home) return pathname === routes.home
  return isPathWithin(pathname, href)
}
