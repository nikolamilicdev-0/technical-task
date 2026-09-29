import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/cn'
import { FIELD_CLASSES } from '../lib/field'

export function Textarea({ className, ...props }: ComponentPropsWithRef<'textarea'>) {
  return (
    <textarea
      className={cn(FIELD_CLASSES, 'min-h-24 resize-y py-2 leading-6', className)}
      {...props}
    />
  )
}
