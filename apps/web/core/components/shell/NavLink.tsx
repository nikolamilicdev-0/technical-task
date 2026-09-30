'use client'

import { Button } from '@kb/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isActivePath } from '@/core/components/shell/is-active-path'
import { icons } from '@/core/icons'
import type { NavItem } from '@/core/types'

interface NavLinkProps {
  item: NavItem
  onNavigate?: () => void
}

export function NavLink({ item, onNavigate }: NavLinkProps) {
  const pathname = usePathname()
  const ariaCurrent = isActivePath(pathname, item.href) ? 'page' : undefined
  const Icon = icons[item.icon]

  return (
    <Button asChild variant="nav">
      <Link href={item.href} aria-current={ariaCurrent} onClick={onNavigate}>
        <Icon aria-hidden />
        {item.label}
      </Link>
    </Button>
  )
}
