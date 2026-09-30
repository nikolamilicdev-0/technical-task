import { useCallback, useEffect, useRef } from 'react'

import { staysPinned } from '@/features/chat/lib/scroll-pinning'

/**
 * Keeps a viewport pinned to the bottom as its content grows, unless the reader scrolled up.
 * The viewport and content elements must stay mounted for the component's lifetime.
 */
export function useAutoScroll() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const lastTopRef = useRef(0)

  const scrollToBottom = useCallback(() => {
    const viewport = viewportRef.current
    pinnedRef.current = true
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content || typeof ResizeObserver === 'undefined') return
    // Our own scroll's event can arrive after new content already made the distance large.
    const followScroll = () => {
      pinnedRef.current = staysPinned(pinnedRef.current, viewport, lastTopRef.current)
      lastTopRef.current = viewport.scrollTop
    }
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) viewport.scrollTop = viewport.scrollHeight
    })
    viewport.addEventListener('scroll', followScroll, { passive: true })
    observer.observe(content)
    return () => {
      viewport.removeEventListener('scroll', followScroll)
      observer.disconnect()
    }
  }, [])

  return { viewportRef, contentRef, scrollToBottom }
}
