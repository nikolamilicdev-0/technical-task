import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentPropsWithRef, MouseEvent } from 'react'

import { cn } from '../lib/cn'
import { Spinner } from './Spinner'

const buttonVariants = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap select-none',
    'transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-60',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary shadow-xs hover:bg-primary/90 active:bg-primary/85',
        secondary:
          'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/75',
        outline:
          'border border-outline-variant bg-surface-container-lowest text-on-surface shadow-xs hover:bg-surface-container-high',
        ghost: 'text-on-surface hover:bg-surface-container-high',
        destructive: 'bg-error text-on-error shadow-xs hover:bg-error/90',
        chip: [
          'rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high',
          'aria-pressed:border-primary aria-pressed:bg-primary-container aria-pressed:text-on-primary-container',
        ],
        link: 'rounded-xs text-primary underline-offset-4 hover:underline',
        // Navigation links: the current page is marked by `aria-current="page"`, not by a prop.
        nav: [
          'w-full justify-start gap-3 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
          'aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container',
        ],
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-11 px-5 text-base',
        icon: 'size-9',
        iconSm: 'size-8',
      },
      fullWidth: { true: 'w-full' },
    },
    // Chips and links keep their own box whatever `size` says (compound classes win the merge).
    compoundVariants: [
      { variant: 'chip', class: 'h-8 px-3' },
      { variant: 'link', class: 'h-auto px-0' },
      { variant: 'nav', class: 'px-3' },
    ],
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export type ButtonProps = ComponentPropsWithRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the single child (e.g. a Next `Link`) with button styling instead of a `<button>`. */
    asChild?: boolean
    /** Shows a spinner and ignores activation while keeping focus (no `disabled` focus loss). */
    loading?: boolean
  }

function preventActivation(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault()
}

export function Button({
  asChild = false,
  loading = false,
  variant,
  size,
  fullWidth,
  className,
  children,
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className)
  if (asChild) {
    return (
      <Slot.Root className={classes} onClick={onClick} {...props}>
        {children}
      </Slot.Root>
    )
  }

  const handleClick = loading ? preventActivation : onClick
  const spinner = loading ? <Spinner size="sm" /> : null
  return (
    <button
      type={type}
      className={classes}
      onClick={handleClick}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {spinner}
      {children}
    </button>
  )
}
