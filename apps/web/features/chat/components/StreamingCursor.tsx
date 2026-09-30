/** A block cursor after the text that is still arriving; decorative, drawn with CSS only. */
export function StreamingCursor() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-2 shrink-0 rounded-xs bg-primary/80 motion-safe:animate-pulse"
    />
  )
}
