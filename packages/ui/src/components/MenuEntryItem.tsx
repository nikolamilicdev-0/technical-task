'use client'

import { cva } from 'class-variance-authority'
import { CheckIcon } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'

import type { MenuEntry } from '../types'

const itemVariants = cva(
  'relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        default: 'text-on-surface data-[highlighted]:bg-surface-container-highest',
        destructive:
          'text-error data-[highlighted]:bg-error-container data-[highlighted]:text-on-error-container',
      },
    },
    defaultVariants: { tone: 'default' },
  }
)

// Multi-select menus stay open while the user ticks several options.
function keepMenuOpen(event: Event): void {
  event.preventDefault()
}

/** Internal to Menu: renders one entry of its `items` list. */
export function MenuEntryItem({ entry }: { entry: MenuEntry }) {
  switch (entry.type) {
    case 'item': {
      const Icon = entry.icon
      return (
        <DropdownMenu.Item
          className={itemVariants({ tone: entry.tone })}
          disabled={entry.disabled}
          onSelect={entry.onSelect}
        >
          {Icon ? <Icon aria-hidden /> : null}
          {entry.label}
        </DropdownMenu.Item>
      )
    }
    case 'checkbox':
      return (
        <DropdownMenu.CheckboxItem
          className={itemVariants({ className: 'ps-8' })}
          checked={entry.checked}
          disabled={entry.disabled}
          onCheckedChange={entry.onCheckedChange}
          onSelect={keepMenuOpen}
        >
          <DropdownMenu.ItemIndicator className="absolute start-2 inline-flex items-center">
            <CheckIcon aria-hidden />
          </DropdownMenu.ItemIndicator>
          {entry.label}
        </DropdownMenu.CheckboxItem>
      )
    case 'label':
      return (
        <DropdownMenu.Label className="px-2 py-1.5 text-xs leading-5 text-on-surface-variant">
          {entry.label}
        </DropdownMenu.Label>
      )
    case 'separator':
      return <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-outline-variant" />
  }
}
