import { PINNED_THRESHOLD_PX } from '@/features/chat/constants'

export interface ScrollPosition {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export function isNearBottom({ scrollTop, scrollHeight, clientHeight }: ScrollPosition): boolean {
  return scrollHeight - scrollTop - clientHeight <= PINNED_THRESHOLD_PX
}

// Reaching the bottom re-pins and scrolling up unpins; anything else (our own scroll landing late)
// keeps the current state.
export function staysPinned(pinned: boolean, position: ScrollPosition, lastTop: number): boolean {
  if (isNearBottom(position)) return true
  if (position.scrollTop < lastTop) return false
  return pinned
}
