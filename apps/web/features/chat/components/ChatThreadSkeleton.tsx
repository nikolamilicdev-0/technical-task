import { Container, Flex, Skeleton, VisuallyHidden } from '@kb/ui'

import { MessagesSkeleton } from '@/features/chat/components/MessagesSkeleton'

interface ChatThreadSkeletonProps {
  /** Announced to screen readers while the conversation loads. */
  label: string
}

/** The whole thread frame (title bar, messages, composer) for the route's loading state. */
export function ChatThreadSkeleton({ label }: ChatThreadSkeletonProps) {
  return (
    <Flex direction="column" role="status" className="min-h-0 flex-1">
      <VisuallyHidden>{label}</VisuallyHidden>
      <Flex
        align="center"
        aria-hidden
        className="h-14 shrink-0 border-b border-outline-variant px-4 md:px-6"
      >
        <Skeleton className="h-5 w-48" />
      </Flex>
      <Container size="md" className="min-h-0 flex-1 overflow-hidden py-6">
        <MessagesSkeleton />
      </Container>
      <Container size="md" aria-hidden className="shrink-0 pb-4 sm:pb-6">
        <Skeleton className="h-24 w-full rounded-xl" />
      </Container>
    </Flex>
  )
}
