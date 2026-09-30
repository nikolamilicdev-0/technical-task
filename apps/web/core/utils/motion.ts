const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** `prefers-reduced-motion` CSS rules cannot reach scrolls started from JS. */
export function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth'
}
