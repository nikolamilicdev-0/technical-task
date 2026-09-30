import { PINNED_THRESHOLD_PX } from '@/features/chat/constants'

export interface ScrollPosition {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export function isNearBottom({ scrollTop, scrollHeight, clientHeight }: ScrollPosition): boolean {
  return scrollHeight - scrollTop - clientHeight <= PINNED_THRESHOLD_PX
}

/**
 * Whether the thread keeps following new content after a scroll event: reaching the bottom
 * re-pins it, moving up unpins it, and anything else (our own scroll landing late) keeps it.
 */
export function staysPinned(pinned: boolean, position: ScrollPosition, lastTop: number): boolean {
  if (isNearBottom(position)) return true
  if (position.scrollTop < lastTop) return false
  return pinned
}
