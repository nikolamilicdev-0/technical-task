import type { SubmitKeyEvent } from '@/features/chat/types'

const ENTER_KEY = 'Enter'
// Safari reports the Enter that confirms an IME composition with this code, not `isComposing`.
const IME_PROCESS_KEY_CODE = 229

/**
 * Plain Enter sends the message. Shift+Enter keeps its new line, other modifiers stay free for
 * shortcuts, and an Enter that confirms an input-method composition never sends.
 */
export function shouldSubmitOnKey(event: SubmitKeyEvent): boolean {
  if (event.key !== ENTER_KEY) return false
  if (event.isComposing || event.keyCode === IME_PROCESS_KEY_CODE) return false
  return !(event.shiftKey || event.altKey || event.ctrlKey || event.metaKey)
}
