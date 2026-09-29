'use client'

import { DropdownMenu } from 'radix-ui'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { FloatingSide, MenuAlign, MenuEntry } from '../types'
import { MenuEntryItem } from './MenuEntryItem'

const MENU_OFFSET_PX = 6

export interface MenuProps {
  /** Rendered through `DropdownMenu.Trigger asChild`, so pass a single Button. */
  trigger: ReactNode
  items: readonly MenuEntry[]
  /** Optional non-interactive heading, e.g. the signed-in account. */
  label?: ReactNode
  align?: MenuAlign
  side?: FloatingSide
  className?: string
}

export function Menu({
  trigger,
  items,
  label,
  align = 'end',
  side = 'bottom',
  className,
}: MenuProps) {
  const header = label ? (
    <DropdownMenu.Label className="truncate px-2 py-1.5 text-xs leading-5 text-on-surface-variant">
      {label}
    </DropdownMenu.Label>
  ) : null
  const entries = items.map((entry) => <MenuEntryItem key={entry.id} entry={entry} />)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={MENU_OFFSET_PX}
          className={cn(
            'z-50 max-w-72 min-w-48 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low p-1 text-on-surface shadow-lg',
            'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
            className
          )}
        >
          {header}
          {entries}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
