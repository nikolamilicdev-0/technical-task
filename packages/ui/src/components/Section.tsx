import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef, ElementType } from 'react'

import { cn } from '../lib/cn'

const sectionVariants = cva('', {
  variants: {
    spacing: {
      none: '',
      sm: 'py-6',
      md: 'py-10',
      lg: 'py-16',
    },
  },
  defaultVariants: { spacing: 'md' },
})

type SectionElement = 'section' | 'div' | 'article' | 'aside'

export type SectionProps<TElement extends SectionElement = 'section'> = {
  as?: TElement
} & Omit<ComponentPropsWithRef<TElement>, 'as'> &
  VariantProps<typeof sectionVariants>

export function Section<TElement extends SectionElement = 'section'>({
  as,
  spacing,
  className,
  ...props
}: SectionProps<TElement>) {
  const Component = (as ?? 'section') as ElementType
  return <Component className={cn(sectionVariants({ spacing }), className)} {...props} />
}
