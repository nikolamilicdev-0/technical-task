import { Flex, Text } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { getChatStrings } from '@/features/chat/lib/chat-strings'

/** Stands in for an answer stopped before its first word, which the API does not keep. */
export function StreamStoppedRow() {
  const strings = getChatStrings(useT())
  const StopIcon = icons.stop

  return (
    <Flex align="center" gap="sm" className="text-on-surface-variant">
      <StopIcon aria-hidden className="size-3 fill-current" />
      <Text variant="caption" tone="inherit">
        {strings.message.stoppedEarly}
      </Text>
    </Flex>
  )
}
