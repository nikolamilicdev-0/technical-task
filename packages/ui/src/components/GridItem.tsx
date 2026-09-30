import type { ComponentPropsWithRef, ElementType } from 'react'

import { cn } from '../lib/cn'
import { GRID_SPAN_CLASSES, responsiveClasses } from '../lib/responsive'
import type { GridSpan, Responsive } from '../types'

type GridItemElement = 'div' | 'li' | 'section' | 'article' | 'aside'

export type GridItemProps<TElement extends GridItemElement = 'div'> = {
  as?: TElement
  colSpan?: Responsive<GridSpan>
} & Omit<ComponentPropsWithRef<TElement>, 'as'>

export function GridItem<TElement extends GridItemElement = 'div'>({
  as,
  colSpan,
  className,
  ...props
}: GridItemProps<TElement>) {
  const Component = (as ?? 'div') as ElementType
  const classes = cn(responsiveClasses(colSpan, GRID_SPAN_CLASSES), className)
  return <Component className={classes} {...props} />
}
