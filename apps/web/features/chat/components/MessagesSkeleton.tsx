import { Flex, Skeleton } from '@kb/ui'

/** Placeholder exchanges while a conversation loads: a question, then its answer, twice. */
export function MessagesSkeleton() {
  return (
    <Flex direction="column" gap="xl" aria-hidden>
      <Flex justify="end">
        <Skeleton className="h-11 w-2/3 rounded-2xl sm:w-1/2" />
      </Flex>
      <Flex direction="column" gap="sm">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/5" />
      </Flex>
      <Flex justify="end">
        <Skeleton className="h-11 w-1/2 rounded-2xl sm:w-2/5" />
      </Flex>
      <Flex direction="column" gap="sm">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </Flex>
    </Flex>
  )
}
