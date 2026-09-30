'use client'

import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'

import type { FloatingSide, MenuAlign } from '../types'

const TOOLTIP_OFFSET_PX = 6

export interface TooltipProps {
  content: ReactNode
  /** The trigger, rendered through `asChild`; it must accept a ref and focus. */
  children: ReactNode
  side?: FloatingSide
  align?: MenuAlign
}

/** Requires a TooltipProvider higher in the tree. */
export function Tooltip({ content, children, side = 'top', align = 'center' }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={TOOLTIP_OFFSET_PX}
          className="z-50 max-w-xs rounded-md bg-inverse-surface px-2.5 py-1.5 text-xs leading-5 text-inverse-on-surface shadow-md data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-pop-in"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
