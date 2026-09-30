const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Scroll behaviour that honours the reader's motion preference (CSS cannot reach JS scrolls). */
export function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth'
}
