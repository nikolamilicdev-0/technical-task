import { Flex, Skeleton, VisuallyHidden } from '@kb/ui'

import { DocumentFormSkeleton } from '@/features/documents/components/DocumentFormSkeleton'

interface DocumentEditorSkeletonProps {
  label: string
}

export function DocumentEditorSkeleton({ label }: DocumentEditorSkeletonProps) {
  return (
    <Flex direction="column" gap="lg" role="status">
      <VisuallyHidden>{label}</VisuallyHidden>
      <Flex direction="column" gap="sm" aria-hidden>
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-56" />
      </Flex>
      <Skeleton className="h-16 w-full rounded-xl" />
      <DocumentFormSkeleton />
    </Flex>
  )
}
