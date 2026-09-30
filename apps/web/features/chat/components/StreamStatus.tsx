import { VisuallyHidden } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { getChatStrings } from '@/features/chat/lib/chat-strings'
import type { ChatStreamStatus } from '@/features/chat/types'

interface StreamStatusProps {
  status: ChatStreamStatus
}

/** Changes with the status only, never per token; the error row announces a failure. */
export function StreamStatus({ status }: StreamStatusProps) {
  const strings = getChatStrings(useT())
  return (
    <VisuallyHidden role="status" aria-live="polite">
      {strings.status[status]}
    </VisuallyHidden>
  )
}
