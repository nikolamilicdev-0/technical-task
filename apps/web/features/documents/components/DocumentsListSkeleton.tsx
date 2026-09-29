import { Card, Flex, Grid, Skeleton, VisuallyHidden } from '@kb/ui'

import { DOCUMENT_GRID_COLUMNS, LIST_SKELETON_CARDS } from '@/features/documents/constants'

interface DocumentsListSkeletonProps {
  /** Announced to screen readers while the documents load. */
  label: string
}

/** Toolbar and card placeholders, for the route's loading state and the first fetch alike. */
export function DocumentsListSkeleton({ label }: DocumentsListSkeletonProps) {
  const cards = Array.from({ length: LIST_SKELETON_CARDS }, (_, index) => (
    <Card key={index} as="li">
      <Flex direction="column" gap="md">
        <Flex justify="between" gap="sm">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </Flex>
        <Flex direction="column" gap="xs">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </Flex>
        <Skeleton className="h-4 w-32" />
      </Flex>
    </Card>
  ))

  return (
    <Flex direction="column" gap="md" role="status">
      <VisuallyHidden>{label}</VisuallyHidden>
      <Flex direction={{ base: 'column', sm: 'row' }} gap="sm" aria-hidden>
        <Skeleton className="h-10 w-full sm:flex-1" />
        <Skeleton className="h-9 w-full sm:w-80" />
      </Flex>
      <Skeleton className="h-4 w-28" />
      <Grid as="ul" columns={DOCUMENT_GRID_COLUMNS} gap="md" aria-hidden>
        {cards}
      </Grid>
    </Flex>
  )
}
