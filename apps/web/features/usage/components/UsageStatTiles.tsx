import type { UsageTotals } from '@kb/contracts'
import { Flex, Grid, Text } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { formatDateRange } from '@/core/utils/format-date'
import { UsageSection } from '@/features/usage/components/UsageSection'
import { USAGE_TILE_COLUMNS } from '@/features/usage/constants'
import { toUsageTiles } from '@/features/usage/lib/format-usage'
import { getUsageStrings } from '@/features/usage/lib/usage-strings'

interface UsageStatTilesProps {
  totals: UsageTotals
  /** The period the totals cover, as the summary echoes it. */
  from: string
  to: string
}

/** Total, prompt and completion tokens plus requests, as one strip of labelled figures. */
export function UsageStatTiles({ totals, from, to }: UsageStatTilesProps) {
  const strings = getUsageStrings(useT())

  const tiles = toUsageTiles(strings, totals).map(({ key, label, value, caption }) => {
    const captionText = caption ? (
      <Text as="dd" variant="caption" tone="muted">
        {caption}
      </Text>
    ) : null
    return (
      <Flex
        key={key}
        direction="column"
        gap="xs"
        className="bg-surface-container-lowest p-4 sm:p-5"
      >
        <Text as="dt" variant="label" tone="muted">
          {label}
        </Text>
        <Text as="dd" variant="title" className="tabular-nums">
          {value}
        </Text>
        {captionText}
      </Flex>
    )
  })

  return (
    <UsageSection title={strings.totals.heading} note={formatDateRange(from, to)}>
      <Grid
        as="dl"
        columns={USAGE_TILE_COLUMNS}
        className="gap-px overflow-hidden rounded-xl border border-outline-variant bg-outline-variant"
      >
        {tiles}
      </Grid>
    </UsageSection>
  )
}
