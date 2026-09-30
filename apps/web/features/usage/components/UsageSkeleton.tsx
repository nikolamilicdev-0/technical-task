import { Card, Flex, Grid, Skeleton, VisuallyHidden } from '@kb/ui'

import {
  USAGE_SKELETON_DAYS,
  USAGE_SKELETON_MODELS,
  USAGE_TILE_COLUMNS,
  USAGE_TILE_KEYS,
} from '@/features/usage/constants'

interface UsageSkeletonProps {
  label: string
}

function SectionHeadingSkeleton() {
  return <Skeleton className="h-5 w-32" />
}

export function UsageSkeleton({ label }: UsageSkeletonProps) {
  const tiles = USAGE_TILE_KEYS.map((key) => (
    <Flex key={key} direction="column" gap="sm" className="bg-surface-container-lowest p-4 sm:p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-28" />
    </Flex>
  ))
  const days = Array.from({ length: USAGE_SKELETON_DAYS }, (_, index) => (
    <Flex key={index} align="center" gap="md">
      <Skeleton className="h-4 w-14 shrink-0" />
      <Skeleton className="h-2 min-w-0 flex-1 rounded-full" />
      <Skeleton className="h-4 w-16 shrink-0" />
    </Flex>
  ))
  const models = Array.from({ length: USAGE_SKELETON_MODELS }, (_, index) => (
    <Skeleton key={index} className="h-5 w-full" />
  ))

  return (
    <Flex direction="column" gap="xl" role="status">
      <VisuallyHidden>{label}</VisuallyHidden>
      <Flex direction="column" gap="sm" aria-hidden>
        <SectionHeadingSkeleton />
        <Grid
          columns={USAGE_TILE_COLUMNS}
          className="gap-px overflow-hidden rounded-xl border border-outline-variant bg-outline-variant"
        >
          {tiles}
        </Grid>
      </Flex>
      <Flex direction="column" gap="sm" aria-hidden>
        <SectionHeadingSkeleton />
        <Card padding="none" className="p-4 sm:p-6">
          <Flex direction="column" gap="md">
            {days}
          </Flex>
        </Card>
      </Flex>
      <Flex direction="column" gap="sm" aria-hidden>
        <SectionHeadingSkeleton />
        <Card padding="none" className="p-4 sm:p-6">
          <Flex direction="column" gap="md">
            {models}
          </Flex>
        </Card>
      </Flex>
    </Flex>
  )
}
