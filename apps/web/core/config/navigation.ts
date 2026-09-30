import { routes } from '@/core/config/routes'
import type { Dictionary } from '@/core/i18n/dictionary'
import type { NavItem, NavItemConfig } from '@/core/types'

const NAV_ITEMS: readonly NavItemConfig[] = [
  { id: 'documents', href: routes.documents.list, icon: 'documents' },
  { id: 'chat', href: routes.chat.index, icon: 'chat' },
  { id: 'usage', href: routes.usage, icon: 'usage' },
]

export function resolveNavItems(labels: Dictionary['nav']): NavItem[] {
  return NAV_ITEMS.map((item) => ({ ...item, label: labels[item.id] }))
}
