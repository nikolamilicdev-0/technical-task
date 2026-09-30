import type { EmbeddingStatus } from '@kb/contracts'
import { Badge, cn, Tooltip } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { STATUS_BADGES } from '@/features/documents/constants'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

interface DocumentStatusBadgeProps {
  status: EmbeddingStatus
  error?: string | null
  className?: string
}

export function DocumentStatusBadge({ status, error, className }: DocumentStatusBadgeProps) {
  const strings = getDocumentsStrings(useT())
  const { tone, icon, spin } = STATUS_BADGES[status]
  const Icon = icons[icon]
  const reason = status === 'failed' ? error : null

  // With a reason the badge takes focus, so keyboard users can open the tooltip too.
  const badge = (
    <Badge
      tone={tone}
      tabIndex={reason ? 0 : undefined}
      className={cn(reason && 'cursor-help', className)}
    >
      <Icon aria-hidden className={cn(spin && 'motion-safe:animate-spin')} />
      {strings.status[status]}
    </Badge>
  )

  if (!reason) return badge
  return <Tooltip content={reason}>{badge}</Tooltip>
}
