import { Flex } from '@kb/ui'

import { NavLink } from '@/core/components/shell/NavLink'
import type { NavItem } from '@/core/types'

interface NavListProps {
  items: readonly NavItem[]
  /** Accessible name of the navigation landmark. */
  label: string
  onNavigate?: () => void
}

export function NavList({ items, label, onNavigate }: NavListProps) {
  const links = items.map((item) => (
    <li key={item.id}>
      <NavLink item={item} onNavigate={onNavigate} />
    </li>
  ))

  return (
    <nav aria-label={label}>
      <Flex as="ul" direction="column" gap="xs">
        {links}
      </Flex>
    </nav>
  )
}
