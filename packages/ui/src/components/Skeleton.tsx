import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/cn'

/** Loading placeholder; size it with `className` to match the content it stands in for. */
export function Skeleton({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-surface-container-high', className)}
      {...props}
    />
  )
}
