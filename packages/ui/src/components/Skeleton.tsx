import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/cn'

export function Skeleton({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-surface-container-high', className)}
      {...props}
    />
  )
}
