// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { PINNED_THRESHOLD_PX } from '@/features/chat/constants'
import { isNearBottom, staysPinned } from '@/features/chat/lib/scroll-pinning'

const CLIENT = 500
const position = (scrollTop: number, scrollHeight = 2000) => ({
  scrollTop,
  scrollHeight,
  clientHeight: CLIENT,
})

describe('isNearBottom', () => {
  it('counts the last few pixels as the bottom', () => {
    expect(isNearBottom(position(1500))).toBe(true)
    expect(isNearBottom(position(1500 - PINNED_THRESHOLD_PX))).toBe(true)
    expect(isNearBottom(position(1400))).toBe(false)
  })
})

describe('staysPinned', () => {
  it('re-pins whenever the reader reaches the bottom', () => {
    expect(staysPinned(false, position(1500), 1200)).toBe(true)
  })

  it('unpins when the reader scrolls up', () => {
    expect(staysPinned(true, position(900), 1500)).toBe(false)
  })

  it('stays pinned when our own scroll lands after new content grew the thread', () => {
    // Scrolled to 1500 of 2000, but a new message already made it 2400 tall.
    expect(staysPinned(true, position(1500, 2400), 1200)).toBe(true)
  })

  it('stays unpinned while the reader keeps reading above the bottom', () => {
    expect(staysPinned(false, position(1000), 900)).toBe(false)
  })
})
