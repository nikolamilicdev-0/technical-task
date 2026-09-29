import { cn } from '../lib/cn'

type SeparatorOrientation = 'horizontal' | 'vertical'

const ORIENTATION_CLASSES = {
  horizontal: 'h-px w-full',
  vertical: 'h-full w-px',
} as const satisfies Record<SeparatorOrientation, string>

export interface SeparatorProps {
  orientation?: SeparatorOrientation
  /** Purely visual rules are hidden from assistive technology. */
  decorative?: boolean
  className?: string
}

export function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
}: SeparatorProps) {
  const semantics = decorative
    ? { role: 'none' as const }
    : { role: 'separator' as const, 'aria-orientation': orientation }
  const classes = cn('shrink-0 bg-outline-variant', ORIENTATION_CLASSES[orientation], className)
  return <div className={classes} {...semantics} />
}
