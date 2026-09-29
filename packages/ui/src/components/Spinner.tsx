import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircleIcon } from 'lucide-react'

import { cn } from '../lib/cn'
import { VisuallyHidden } from './VisuallyHidden'

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: { sm: 'size-4', md: 'size-5', lg: 'size-8' },
  },
  defaultVariants: { size: 'md' },
})

export type SpinnerProps = VariantProps<typeof spinnerVariants> & {
  /** Announced to assistive technology; omit when the surrounding control already says it. */
  label?: string
  className?: string
}

export function Spinner({ size, label, className }: SpinnerProps) {
  const icon = <LoaderCircleIcon aria-hidden className={cn(spinnerVariants({ size }), className)} />
  if (!label) return icon
  return (
    <span role="status" className="inline-flex items-center">
      {icon}
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  )
}
