import { Button } from '@kb/ui'

interface SkipLinkProps {
  targetId: string
  label: string
}

/** First focusable element: lets keyboard users jump past the navigation. */
export function SkipLink({ targetId, label }: SkipLinkProps) {
  const href = `#${targetId}`
  // Parked above the viewport rather than `sr-only`, so it keeps the button's box when shown.
  return (
    <Button asChild className="fixed start-4 -top-20 z-50 shadow-lg focus-visible:top-4">
      <a href={href}>{label}</a>
    </Button>
  )
}
