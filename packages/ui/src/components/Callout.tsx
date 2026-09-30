import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/cn'
import type { IconComponent } from '../types'

const calloutVariants = cva(
  'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-5 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      tone: {
        info: 'border-primary/20 bg-primary-container text-on-primary-container',
        success: 'border-success/20 bg-success-container text-on-success-container',
        warning: 'border-warning/25 bg-warning-container text-on-warning-container',
        error: 'border-error/20 bg-error-container text-on-error-container',
      },
    },
    defaultVariants: { tone: 'info' },
  }
)

export type CalloutProps = ComponentPropsWithRef<'div'> &
  VariantProps<typeof calloutVariants> & {
    icon?: IconComponent
  }

/** Pass `role="alert"` when it appears after an action. */
export function Callout({ tone, icon: Icon, className, children, ...props }: CalloutProps) {
  return (
    <div className={cn(calloutVariants({ tone }), className)} {...props}>
      {Icon ? <Icon aria-hidden /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
