import type { SubmitKeyEvent } from '@/features/chat/types'

const ENTER_KEY = 'Enter'
// Safari reports the Enter that confirms an IME composition with this code, not `isComposing`.
const IME_PROCESS_KEY_CODE = 229

export function shouldSubmitOnKey(event: SubmitKeyEvent): boolean {
  if (event.key !== ENTER_KEY) return false
  if (event.isComposing || event.keyCode === IME_PROCESS_KEY_CODE) return false
  return !(event.shiftKey || event.altKey || event.ctrlKey || event.metaKey)
}
