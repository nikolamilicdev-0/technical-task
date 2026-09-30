import { Button, EmptyState, type EmptyStateProps } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  titleAs?: EmptyStateProps['titleAs']
}

export function ErrorState({ title, description, onRetry, titleAs }: ErrorStateProps) {
  const t = useT()
  const retryButton = onRetry ? (
    <Button variant="outline" onClick={onRetry}>
      {t.common.retry}
    </Button>
  ) : null

  return (
    <EmptyState
      icon={icons.error}
      title={title ?? t.states.error.title}
      description={description ?? t.states.error.description}
      action={retryButton}
      titleAs={titleAs}
    />
  )
}
