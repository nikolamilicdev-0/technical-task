import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/cn'

export function VisuallyHidden({ className, ...props }: ComponentPropsWithRef<'span'>) {
  return <span className={cn('sr-only', className)} {...props} />
}
