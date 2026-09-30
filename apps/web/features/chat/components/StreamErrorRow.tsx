import { Button, Callout, Flex, Text } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { describeStreamError } from '@/features/chat/lib/chat-strings'
import { canRetry } from '@/features/chat/lib/to-stream-error'
import type { StreamError } from '@/features/chat/types'

interface StreamErrorRowProps {
  error: StreamError
  onRetry: () => void
}

/** Why the answer failed, under the question it belongs to, with a retry when one can help. */
export function StreamErrorRow({ error, onRetry }: StreamErrorRowProps) {
  const t = useT()
  const retryButton = canRetry(error) ? (
    <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
      {t.common.retry}
    </Button>
  ) : null

  return (
    <Callout tone="error" icon={icons.error} role="alert">
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        justify="between"
        gap="sm"
        className="sm:items-center"
      >
        <Text as="span" tone="inherit">
          {describeStreamError(t, error)}
        </Text>
        {retryButton}
      </Flex>
    </Callout>
  )
}
