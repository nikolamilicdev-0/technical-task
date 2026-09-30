'use client'

import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import type { ReactNode, Ref } from 'react'

import { cn } from '../lib/cn'

type ScrollOrientation = 'vertical' | 'horizontal' | 'both'
type ScrollbarOrientation = 'vertical' | 'horizontal'
type ScrollbarVisibility = 'hover' | 'auto' | 'always' | 'scroll'

const SCROLLBARS = {
  vertical: ['vertical'],
  horizontal: ['horizontal'],
  both: ['vertical', 'horizontal'],
} as const satisfies Record<ScrollOrientation, readonly ScrollbarOrientation[]>

export interface ScrollAreaProps {
  children: ReactNode
  orientation?: ScrollOrientation
  scrollbarVisibility?: ScrollbarVisibility
  className?: string
  viewportClassName?: string
  viewportRef?: Ref<HTMLDivElement>
  /** Makes the viewport a named, focusable region, for content with nothing focusable in it. */
  viewportLabel?: string
}

export function ScrollArea({
  children,
  orientation = 'vertical',
  scrollbarVisibility = 'hover',
  className,
  viewportClassName,
  viewportRef,
  viewportLabel,
}: ScrollAreaProps) {
  const scrollbars = SCROLLBARS[orientation].map((scrollbarOrientation) => (
    <ScrollAreaPrimitive.Scrollbar
      key={scrollbarOrientation}
      orientation={scrollbarOrientation}
      className="flex touch-none p-0.5 transition-colors select-none data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:w-2.5"
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-outline-variant hover:bg-outline" />
    </ScrollAreaPrimitive.Scrollbar>
  ))
  const keyboardAccess = viewportLabel
    ? { role: 'region', 'aria-label': viewportLabel, tabIndex: 0 }
    : undefined

  return (
    <ScrollAreaPrimitive.Root
      type={scrollbarVisibility}
      className={cn('relative overflow-hidden', className)}
    >
      {/* The root clips overflow, so the focus ring is drawn inside the viewport's edge. */}
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn('size-full focus-visible:-outline-offset-2', viewportClassName)}
        {...keyboardAccess}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {scrollbars}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}
