import { Card, Flex, Skeleton, VisuallyHidden } from '@kb/ui'

// Title and tags; the content editor below gets its own, taller placeholder.
const SHORT_FIELD_COUNT = 2

interface DocumentFormSkeletonProps {
  /** Announced while loading; omit it inside a skeleton that already announces itself. */
  label?: string
}

export function DocumentFormSkeleton({ label }: DocumentFormSkeletonProps) {
  const shortFields = Array.from({ length: SHORT_FIELD_COUNT }, (_, index) => (
    <Flex key={index} direction="column" gap="xs">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-10 w-full" />
    </Flex>
  ))
  const announcement = label ? <VisuallyHidden>{label}</VisuallyHidden> : null

  return (
    <Card padding="none" role={label ? 'status' : undefined}>
      {announcement}
      <Flex direction="column" gap="lg" className="p-4 sm:p-6" aria-hidden>
        {shortFields}
        <Flex direction="column" gap="xs">
          <Flex align="end" justify="between" gap="sm">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </Flex>
          <Skeleton className="h-96 w-full" />
        </Flex>
        <Flex justify="end">
          <Skeleton className="h-9 w-32" />
        </Flex>
      </Flex>
    </Card>
  )
}
