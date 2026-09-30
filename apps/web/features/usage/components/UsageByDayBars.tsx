import type { UsageByDay } from '@kb/contracts'
import { Card, cn, Flex, Text } from '@kb/ui'
import { useId } from 'react'

import { useT } from '@/core/i18n/useT'
import { UsageSection } from '@/features/usage/components/UsageSection'
import { toUsageDayRows } from '@/features/usage/lib/format-usage'
import { getUsageStrings } from '@/features/usage/lib/usage-strings'

interface UsageByDayBarsProps {
  days: readonly UsageByDay[]
}

export function UsageByDayBars({ days }: UsageByDayBarsProps) {
  const strings = getUsageStrings(useT())
  const headingId = useId()

  const rows = toUsageDayRows(days).map(({ day, label, tokens, width }) => (
    <Flex as="li" key={day} align="center" gap="md">
      <Text as="time" dateTime={day} variant="caption" tone="muted" className="w-14 shrink-0">
        {label}
      </Text>
      <div aria-hidden className="h-2 min-w-0 flex-1 rounded-full bg-surface-container-high">
        {/* A day with any usage keeps a sliver of bar next to a much busier one. */}
        <div
          className={cn('h-full rounded-full bg-primary', width > 0 && 'min-w-1.5')}
          style={{ width: `${width}%` }}
        />
      </div>
      <Text as="span" className="w-24 shrink-0 text-end tabular-nums">
        {tokens}
      </Text>
    </Flex>
  ))

  return (
    <UsageSection headingId={headingId} title={strings.byDay.heading} note={strings.byDay.note}>
      <Card padding="none" className="p-4 sm:p-6">
        <Flex as="ol" direction="column" gap="sm" aria-labelledby={headingId}>
          {rows}
        </Flex>
      </Card>
    </UsageSection>
  )
}
