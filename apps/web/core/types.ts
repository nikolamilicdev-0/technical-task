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

/** A resolved navigation entry: serialisable so server layouts can hand it to client links. */
export interface NavItem extends NavItemConfig {
  label: string
}

/** Props Next.js passes to an `error.tsx` boundary. */
export interface RouteErrorProps {
  error: Error & { digest?: string }
  /** Re-fetches and re-renders the failed segment. */
  retry: () => void
}
