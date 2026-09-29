import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/cn'

/** Content for screen readers only, such as a label for an icon-only control. */
export function VisuallyHidden({ className, ...props }: ComponentPropsWithRef<'span'>) {
  return <span className={cn('sr-only', className)} {...props} />
}
