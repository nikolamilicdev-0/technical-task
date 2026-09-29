import { Flex } from '@kb/ui'
import type { ReactNode } from 'react'

import { MAIN_CONTENT_ID } from '@/core/components/shell/constants'
import { MobileNav } from '@/core/components/shell/MobileNav'
import { SidebarNav } from '@/core/components/shell/SidebarNav'
import { SkipLink } from '@/core/components/shell/SkipLink'
import { resolveNavItems } from '@/core/config/navigation'
import { getDictionary } from '@/core/i18n/dictionary'
import type { CurrentUser } from '@/core/types'

interface AppShellProps {
  user: CurrentUser
  children: ReactNode
}

/** Signed-in frame: sidebar from `md` up, top bar with a drawer below it. */
export function AppShell({ user, children }: AppShellProps) {
  const t = getDictionary()
  const navItems = resolveNavItems(t.nav)

  return (
    <Flex className="min-h-dvh">
      <SkipLink targetId={MAIN_CONTENT_ID} label={t.shell.skipToContent} />
      <SidebarNav items={navItems} email={user.email} />
      <Flex direction="column" className="min-w-0 flex-1">
        <MobileNav items={navItems} email={user.email} />
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-hidden">
          {children}
        </main>
      </Flex>
    </Flex>
  )
}
