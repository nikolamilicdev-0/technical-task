import type { IconName } from '@/core/icons'

export interface CurrentUser {
  id: string
  email: string | null
}

export type NavItemId = 'documents' | 'chat' | 'usage'

export interface NavItemConfig {
  id: NavItemId
  href: string
  icon: IconName
}

/** Serialisable, so server layouts can hand it to client links. */
export interface NavItem extends NavItemConfig {
  label: string
}

export interface RouteErrorProps {
  error: Error & { digest?: string }
  /** Re-fetches and re-renders the failed segment. */
  retry: () => void
}
