import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-container-high text-on-surface-variant',
        primary: 'bg-primary-container text-on-primary-container',
        success: 'bg-success-container text-on-success-container',
        warning: 'bg-warning-container text-on-warning-container',
        error: 'bg-error-container text-on-error-container',
      },
    },
    defaultVariants: { tone: 'neutral' },
  }
)

export type BadgeProps = ComponentPropsWithRef<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ tone, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
