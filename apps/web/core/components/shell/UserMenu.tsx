'use client'

import { Button, Flex, Menu, Text, type MenuEntry } from '@kb/ui'

import { useSignOut } from '@/core/auth/useSignOut'
import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'

const TRIGGER_LAYOUTS = {
  full: {
    className: 'h-auto w-full justify-start gap-2.5 px-2 py-1.5',
    align: 'start',
    side: 'top',
  },
  compact: { className: 'size-9 rounded-full p-0', align: 'end', side: 'bottom' },
} as const

interface UserMenuProps {
  email: string | null
  /** Avatar-only trigger, for the mobile top bar. */
  compact?: boolean
}

export function UserMenu({ email, compact = false }: UserMenuProps) {
  const t = useT()
  const { signOut, isSigningOut } = useSignOut()
  const layout = TRIGGER_LAYOUTS[compact ? 'compact' : 'full']
  const UserIcon = icons.user

  const items: MenuEntry[] = [
    {
      type: 'item',
      id: 'sign-out',
      label: t.shell.signOut,
      icon: icons.signOut,
      onSelect: signOut,
      disabled: isSigningOut,
    },
  ]
  const heading = email ? interpolate(t.shell.signedInAs, { email }) : undefined
  const avatarContent = email?.charAt(0).toUpperCase() ?? <UserIcon className="size-4" />
  // The visible email names the full trigger; the avatar-only one needs its own label.
  const triggerLabel = compact ? t.shell.accountMenu : undefined
  const emailText = compact ? null : (
    <Text as="span" truncate className="min-w-0 flex-1 text-start">
      {email}
    </Text>
  )

  const trigger = (
    <Button variant="ghost" aria-label={triggerLabel} className={layout.className}>
      <Flex
        aria-hidden
        align="center"
        justify="center"
        className="size-7 shrink-0 rounded-full bg-secondary-container text-xs font-semibold text-on-secondary-container"
      >
        {avatarContent}
      </Flex>
      {emailText}
    </Button>
  )

  return (
    <Menu trigger={trigger} items={items} label={heading} align={layout.align} side={layout.side} />
  )
}
