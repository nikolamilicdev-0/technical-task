import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/cn'
import { FIELD_CLASSES } from '../lib/field'

export function Input({ className, type = 'text', ...props }: ComponentPropsWithRef<'input'>) {
  return <input type={type} className={cn(FIELD_CLASSES, 'h-10', className)} {...props} />
}
