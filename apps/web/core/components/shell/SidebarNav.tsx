import { Flex } from '@kb/ui'

import { NavList } from '@/core/components/shell/NavList'
import { UserMenu } from '@/core/components/shell/UserMenu'
import { Wordmark } from '@/core/components/shell/Wordmark'
import { routes } from '@/core/config/routes'
import { getDictionary } from '@/core/i18n/dictionary'
import type { NavItem } from '@/core/types'

interface SidebarNavProps {
  items: readonly NavItem[]
  email: string | null
}

/** A `header` like the mobile bar, so the wordmark and account menu sit inside a landmark. */
export function SidebarNav({ items, email }: SidebarNavProps) {
  const t = getDictionary()
  return (
    <Flex
      as="header"
      direction="column"
      justify="between"
      gap="lg"
      className="sticky top-0 hidden h-dvh w-64 shrink-0 border-e border-outline-variant bg-surface-container-low px-3 py-4 md:flex"
    >
      <Flex direction="column" gap="lg">
        <Wordmark name={t.common.appName} href={routes.documents.list} />
        <NavList items={items} label={t.nav.label} />
      </Flex>
      <UserMenu email={email} />
    </Flex>
  )
}
