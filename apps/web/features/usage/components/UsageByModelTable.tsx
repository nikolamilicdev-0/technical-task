import type { UsageByModel } from '@kb/contracts'
import { Card, cn, ScrollArea, Text } from '@kb/ui'
import { useId } from 'react'

import { useT } from '@/core/i18n/useT'
import { formatNumber } from '@/core/utils/format-number'
import { UsageSection } from '@/features/usage/components/UsageSection'
import {
  USAGE_MODEL_COLUMN_KEYS,
  USAGE_MODEL_COUNT_KEYS,
  USAGE_MODEL_EMPHASIZED_COUNT,
} from '@/features/usage/constants'
import { describeKind, getUsageStrings } from '@/features/usage/lib/usage-strings'
import type { UsageModelColumnKey } from '@/features/usage/types'

interface UsageByModelTableProps {
  models: readonly UsageByModel[]
}

// Collapsed table borders ignore padding on <table>, so the outer cells inset the rows.
const CELL =
  'py-3 pe-6 text-start align-baseline whitespace-nowrap first:ps-4 last:pe-4 sm:first:ps-6 sm:last:pe-6'
const NUMERIC_CELL = cn(CELL, 'text-end tabular-nums')
const COUNT_COLUMNS: ReadonlySet<UsageModelColumnKey> = new Set(USAGE_MODEL_COUNT_KEYS)

/** Tokens and requests per provider, model and kind; it scrolls sideways on narrow screens. */
export function UsageByModelTable({ models }: UsageByModelTableProps) {
  const strings = getUsageStrings(useT())
  const headingId = useId()
  const copy = strings.byModel

  const headers = USAGE_MODEL_COLUMN_KEYS.map((key) => (
    <th key={key} scope="col" className={cn(COUNT_COLUMNS.has(key) ? NUMERIC_CELL : CELL, 'pt-0')}>
      <Text as="span" variant="caption" tone="muted" weight="medium">
        {copy.columns[key]}
      </Text>
    </th>
  ))
  const rows = models.map((row) => {
    const counts = USAGE_MODEL_COUNT_KEYS.map((key) => {
      const weight = key === USAGE_MODEL_EMPHASIZED_COUNT ? 'medium' : undefined
      return (
        <td key={key} className={NUMERIC_CELL}>
          <Text as="span" weight={weight}>
            {formatNumber(row[key])}
          </Text>
        </td>
      )
    })
    return (
      <tr
        key={`${row.provider}:${row.model}:${row.kind}`}
        className="border-t border-outline-variant"
      >
        <td className={CELL}>
          <Text as="span" tone="muted">
            {row.provider}
          </Text>
        </td>
        <th scope="row" className={cn(CELL, 'font-normal')}>
          <Text as="span" variant="code">
            {row.model}
          </Text>
        </th>
        <td className={CELL}>
          <Text as="span">{describeKind(strings, row.kind)}</Text>
        </td>
        {counts}
      </tr>
    )
  })

  return (
    <UsageSection headingId={headingId} title={copy.heading} note={copy.note}>
      <Card padding="none" className="overflow-hidden pt-4 pb-1 sm:pt-5">
        <ScrollArea
          orientation="horizontal"
          scrollbarVisibility="auto"
          viewportLabel={copy.heading}
        >
          <table aria-labelledby={headingId} className="w-full text-sm">
            <thead>
              <tr>{headers}</tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </ScrollArea>
      </Card>
    </UsageSection>
  )
}
