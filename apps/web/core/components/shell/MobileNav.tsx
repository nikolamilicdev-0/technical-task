'use client'

import { Button, Dialog, Flex } from '@kb/ui'
import { useState } from 'react'

import { NavList } from '@/core/components/shell/NavList'
import { UserMenu } from '@/core/components/shell/UserMenu'
import { Wordmark } from '@/core/components/shell/Wordmark'
import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import type { NavItem } from '@/core/types'

interface MobileNavProps {
  items: readonly NavItem[]
  email: string | null
}

export function MobileNav({ items, email }: MobileNavProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const closeDrawer = () => setOpen(false)
  const MenuIcon = icons.menu

  const trigger = (
    <Button variant="ghost" size="icon" aria-label={t.shell.openNavigation}>
      <MenuIcon aria-hidden />
    </Button>
  )

  return (
    <Flex
      as="header"
      align="center"
      justify="between"
      gap="sm"
      className="sticky top-0 z-40 h-14 border-b border-outline-variant bg-surface/90 px-2 backdrop-blur-sm md:hidden"
    >
      <Flex align="center" gap="xs" className="min-w-0">
        <Dialog
          open={open}
          onOpenChange={setOpen}
          trigger={trigger}
          title={t.common.appName}
          closeLabel={t.shell.closeNavigation}
          placement="start"
        >
          <NavList items={items} label={t.nav.label} onNavigate={closeDrawer} />
        </Dialog>
        <Wordmark name={t.common.appName} href={routes.documents.list} />
      </Flex>
      <UserMenu email={email} compact />
    </Flex>
  )
}
