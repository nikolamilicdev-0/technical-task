// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { shouldSubmitOnKey } from '@/features/chat/lib/should-submit-on-key'
import type { SubmitKeyEvent } from '@/features/chat/types'

const ENTER_KEY_CODE = 13

function key(overrides: Partial<SubmitKeyEvent> = {}): SubmitKeyEvent {
  return {
    key: 'Enter',
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
    keyCode: ENTER_KEY_CODE,
    ...overrides,
  }
}

describe('shouldSubmitOnKey', () => {
  it('sends on a plain Enter', () => {
    expect(shouldSubmitOnKey(key())).toBe(true)
  })

  it('leaves Shift+Enter to insert a new line', () => {
    expect(shouldSubmitOnKey(key({ shiftKey: true }))).toBe(false)
  })

  it.each(['altKey', 'ctrlKey', 'metaKey'] as const)('ignores Enter with %s', (modifier) => {
    expect(shouldSubmitOnKey(key({ [modifier]: true }))).toBe(false)
  })

  it('never sends while an input method is composing', () => {
    expect(shouldSubmitOnKey(key({ isComposing: true }))).toBe(false)
  })

  it('treats the IME process key code as composing (Safari)', () => {
    expect(shouldSubmitOnKey(key({ keyCode: 229 }))).toBe(false)
  })

  it('ignores other keys', () => {
    expect(shouldSubmitOnKey(key({ key: 'a', keyCode: 65 }))).toBe(false)
  })
})
