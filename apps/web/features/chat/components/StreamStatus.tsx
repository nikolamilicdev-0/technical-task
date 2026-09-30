import { VisuallyHidden } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { getChatStrings } from '@/features/chat/lib/chat-strings'
import type { ChatStreamStatus } from '@/features/chat/types'

interface StreamStatusProps {
  status: ChatStreamStatus
}

/**
 * Announces the answer's progress to screen readers. Its text changes with the status only,
 * never per token; a failure is announced by the error row instead.
 */
export function StreamStatus({ status }: StreamStatusProps) {
  const strings = getChatStrings(useT())
  return (
    <VisuallyHidden role="status" aria-live="polite">
      {strings.status[status]}
    </VisuallyHidden>
  )
}
