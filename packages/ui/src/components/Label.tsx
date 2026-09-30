import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/cn'

export function Label({ htmlFor, className, ...props }: ComponentPropsWithRef<'label'>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-sm leading-5 font-medium text-on-surface', className)}
      {...props}
    />
  )
}
