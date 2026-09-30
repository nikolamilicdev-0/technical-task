import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getCurrentUser } from '@/core/auth/get-current-user'
import { buildLoginPath } from '@/core/auth/resolve-auth-redirect'
import { AppShell } from '@/core/components/shell/AppShell'

// proxy.ts redirects first; this check keeps the shell safe if the matcher ever skips a route.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect(buildLoginPath())
  return <AppShell user={user}>{children}</AppShell>
}
