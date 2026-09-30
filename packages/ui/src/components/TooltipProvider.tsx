'use client'

import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'

const TOOLTIP_DELAY_MS = 300

export interface TooltipProviderProps {
  children: ReactNode
  delayDuration?: number
}

export function TooltipProvider({
  children,
  delayDuration = TOOLTIP_DELAY_MS,
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>{children}</TooltipPrimitive.Provider>
  )
}
