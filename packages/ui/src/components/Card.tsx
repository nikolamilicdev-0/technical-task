import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef, ElementType } from 'react'

import { cn } from '../lib/cn'

const cardVariants = cva(
  'rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface',
  {
    variants: {
      padding: { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' },
      interactive: {
        true: 'transition-colors hover:border-outline hover:bg-surface-bright',
      },
      elevated: { true: 'shadow-sm' },
    },
    defaultVariants: { padding: 'md' },
  }
)

type CardElement = 'div' | 'article' | 'section' | 'li' | 'aside'

export type CardProps<TElement extends CardElement = 'div'> = {
  as?: TElement
} & Omit<ComponentPropsWithRef<TElement>, 'as'> &
  VariantProps<typeof cardVariants>

export function Card<TElement extends CardElement = 'div'>({
  as,
  padding,
  interactive,
  elevated,
  className,
  ...props
}: CardProps<TElement>) {
  const Component = (as ?? 'div') as ElementType
  const classes = cn(cardVariants({ padding, interactive, elevated }), className)
  return <Component className={classes} {...props} />
}
