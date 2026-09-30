import { type RefObject, useLayoutEffect } from 'react'

export function useAutosizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string
): void {
  useLayoutEffect(() => {
    const textarea = ref.current
    if (!textarea) return
    // Collapse first so deleted lines shrink it; borders sit outside `scrollHeight`.
    textarea.style.height = 'auto'
    const borders = textarea.offsetHeight - textarea.clientHeight
    textarea.style.height = `${textarea.scrollHeight + borders}px`
  }, [ref, value])
}
