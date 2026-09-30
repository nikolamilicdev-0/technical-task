import { Flex, Skeleton, VisuallyHidden } from '@kb/ui'

import { CONVERSATION_SKELETON_ITEMS } from '@/features/chat/constants'

interface ConversationListSkeletonProps {
  /** Announced to screen readers while the conversations load. */
  label: string
}

export function ConversationListSkeleton({ label }: ConversationListSkeletonProps) {
  const rows = Array.from({ length: CONVERSATION_SKELETON_ITEMS }, (_, index) => (
    <Flex as="li" key={index} direction="column" gap="xs" className="px-3 py-2">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/3" />
    </Flex>
  ))

  return (
    <Flex direction="column" role="status">
      <VisuallyHidden>{label}</VisuallyHidden>
      <Flex as="ul" direction="column" gap="xs" aria-hidden>
        {rows}
      </Flex>
    </Flex>
  )
}
