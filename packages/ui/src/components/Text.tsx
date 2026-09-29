import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef, ElementType } from 'react'

import { cn } from '../lib/cn'

const textVariants = cva('', {
  variants: {
    variant: {
      display:
        'font-display text-4xl leading-tight font-medium tracking-tight text-balance lg:text-5xl',
      title:
        'font-display text-2xl leading-tight font-medium tracking-tight text-balance sm:text-3xl',
      heading: 'text-lg leading-7 font-semibold tracking-tight',
      subheading: 'text-base leading-6 font-semibold',
      body: 'text-sm leading-6',
      caption: 'text-xs leading-5',
      label: 'text-sm leading-5 font-medium',
      code: 'rounded-xs bg-surface-container-high px-1 py-0.5 font-mono text-code',
    },
    tone: {
      default: 'text-on-surface',
      muted: 'text-on-surface-variant',
      primary: 'text-primary',
      error: 'text-error',
      success: 'text-success',
      warning: 'text-warning',
      inherit: 'text-inherit',
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
    align: {
      start: 'text-start',
      center: 'text-center',
      end: 'text-end',
    },
    truncate: {
      true: 'truncate',
    },
  },
  defaultVariants: { variant: 'body', tone: 'default' },
})

type TextVariant = NonNullable<VariantProps<typeof textVariants>['variant']>

type TextElement =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'p'
  | 'span'
  | 'div'
  | 'strong'
  | 'em'
  | 'small'
  | 'code'
  | 'label'
  | 'time'
  | 'dt'
  | 'dd'
  | 'li'
  | 'figcaption'
  | 'legend'

const DEFAULT_ELEMENT = {
  display: 'h1',
  title: 'h1',
  heading: 'h2',
  subheading: 'h3',
  body: 'p',
  caption: 'span',
  label: 'span',
  code: 'code',
} as const satisfies Record<TextVariant, TextElement>

export type TextProps<TElement extends TextElement = 'p'> = {
  as?: TElement
} & Omit<ComponentPropsWithRef<TElement>, 'as'> &
  VariantProps<typeof textVariants>

/** All user-facing copy goes through Text: the variant picks size and the semantic element. */
export function Text<TElement extends TextElement = 'p'>({
  as,
  variant,
  tone,
  weight,
  align,
  truncate,
  className,
  ...props
}: TextProps<TElement>) {
  const Component = (as ?? DEFAULT_ELEMENT[variant ?? 'body']) as ElementType
  const classes = cn(textVariants({ variant, tone, weight, align, truncate }), className)
  return <Component className={classes} {...props} />
}
