'use client'

import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import type { ReactNode, Ref } from 'react'

import { cn } from '../lib/cn'

type ScrollOrientation = 'vertical' | 'horizontal' | 'both'
type ScrollbarOrientation = 'vertical' | 'horizontal'

const SCROLLBARS = {
  vertical: ['vertical'],
  horizontal: ['horizontal'],
  both: ['vertical', 'horizontal'],
} as const satisfies Record<ScrollOrientation, readonly ScrollbarOrientation[]>

export interface ScrollAreaProps {
  children: ReactNode
  orientation?: ScrollOrientation
  className?: string
  viewportClassName?: string
  /** The scrolling element, e.g. for keeping a chat thread pinned to the bottom. */
  viewportRef?: Ref<HTMLDivElement>
}

export function ScrollArea({
  children,
  orientation = 'vertical',
  className,
  viewportClassName,
  viewportRef,
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

  return (
    <ScrollAreaPrimitive.Root className={cn('relative overflow-hidden', className)}>
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn('size-full', viewportClassName)}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {scrollbars}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}
