import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef, ElementType } from 'react'

import { cn } from '../lib/cn'
import { GRID_COLUMN_CLASSES, responsiveClasses } from '../lib/responsive'
import { GAP_CLASSES } from '../lib/space'
import type { GridColumns, Responsive } from '../types'

const gridVariants = cva('grid', {
  variants: {
    gap: GAP_CLASSES,
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
  },
})

type GridElement = 'div' | 'section' | 'ul' | 'ol' | 'dl' | 'form'

export type GridProps<TElement extends GridElement = 'div'> = {
  as?: TElement
  columns?: Responsive<GridColumns>
} & Omit<ComponentPropsWithRef<TElement>, 'as'> &
  VariantProps<typeof gridVariants>

export function Grid<TElement extends GridElement = 'div'>({
  as,
  columns,
  gap,
  align,
  className,
  ...props
}: GridProps<TElement>) {
  const Component = (as ?? 'div') as ElementType
  const classes = cn(
    gridVariants({ gap, align }),
    responsiveClasses(columns, GRID_COLUMN_CLASSES),
    className
  )
  return <Component className={classes} {...props} />
}
