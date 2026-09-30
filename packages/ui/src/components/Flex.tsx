import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef, ElementType } from 'react'

import { cn } from '../lib/cn'
import { FLEX_DIRECTION_CLASSES, responsiveClasses } from '../lib/responsive'
import { GAP_CLASSES } from '../lib/space'
import type { FlexDirection, Responsive } from '../types'

const flexVariants = cva('flex', {
  variants: {
    inline: { true: 'inline-flex' },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    },
    wrap: { true: 'flex-wrap' },
    gap: GAP_CLASSES,
  },
})

type FlexElement =
  | 'div'
  | 'span'
  | 'section'
  | 'article'
  | 'aside'
  | 'header'
  | 'footer'
  | 'main'
  | 'nav'
  | 'form'
  | 'fieldset'
  | 'label'
  | 'ul'
  | 'ol'
  | 'li'

export type FlexProps<TElement extends FlexElement = 'div'> = {
  as?: TElement
  direction?: Responsive<FlexDirection>
} & Omit<ComponentPropsWithRef<TElement>, 'as'> &
  VariantProps<typeof flexVariants>

export function Flex<TElement extends FlexElement = 'div'>({
  as,
  direction,
  inline,
  align,
  justify,
  wrap,
  gap,
  className,
  ...props
}: FlexProps<TElement>) {
  // Asserted rather than annotated: narrowing to the tag union would clash on `ref` types.
  const Component = (as ?? 'div') as ElementType
  const classes = cn(
    flexVariants({ inline, align, justify, wrap, gap }),
    responsiveClasses(direction, FLEX_DIRECTION_CLASSES),
    className
  )
  return <Component className={classes} {...props} />
}
