import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef, ElementType } from 'react'

import { cn } from '../lib/cn'

const containerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-8', {
  variants: {
    size: {
      sm: 'max-w-2xl',
      md: 'max-w-4xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-none',
    },
  },
  defaultVariants: { size: 'lg' },
})

type ContainerElement = 'div' | 'main' | 'section' | 'header' | 'footer'

export type ContainerProps<TElement extends ContainerElement = 'div'> = {
  as?: TElement
} & Omit<ComponentPropsWithRef<TElement>, 'as'> &
  VariantProps<typeof containerVariants>

/** Centred, width-capped page column with responsive inline padding. */
export function Container<TElement extends ContainerElement = 'div'>({
  as,
  size,
  className,
  ...props
}: ContainerProps<TElement>) {
  const Component = (as ?? 'div') as ElementType
  return <Component className={cn(containerVariants({ size }), className)} {...props} />
}
