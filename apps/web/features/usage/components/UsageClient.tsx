'use client'

import { Flex } from '@kb/ui'

import { getErrorMessage } from '@/core/api/get-error-message'
import { ErrorState } from '@/core/components/states/ErrorState'
import { useT } from '@/core/i18n/useT'
import { UsageByDayBars } from '@/features/usage/components/UsageByDayBars'
import { UsageByModelTable } from '@/features/usage/components/UsageByModelTable'
import { UsageEmpty } from '@/features/usage/components/UsageEmpty'
import { UsageSkeleton } from '@/features/usage/components/UsageSkeleton'
import { UsageStatTiles } from '@/features/usage/components/UsageStatTiles'
import { useUsageSummary } from '@/features/usage/hooks/useUsageSummary'
import { getUsageView } from '@/features/usage/lib/get-usage-view'
import { getUsageStrings } from '@/features/usage/lib/usage-strings'

/** The usage page below its header: loading, error, empty and the summary itself. */
export function UsageClient() {
  const t = useT()
  const strings = getUsageStrings(t)
  const query = useUsageSummary()
  const view = getUsageView(query.data, query.isError)

  switch (view.status) {
    case 'loading':
      return <UsageSkeleton label={strings.loading} />
    case 'error': {
      const retry = () => void query.refetch()
      return (
        <ErrorState
          title={strings.errorTitle}
          description={getErrorMessage(query.error, t.errors)}
          onRetry={retry}
        />
      )
    }
    case 'empty':
      return <UsageEmpty />
    case 'summary': {
      const { summary } = view
      return (
        <Flex direction="column" gap="xl">
          <UsageStatTiles totals={summary.totals} from={summary.from} to={summary.to} />
          <UsageByDayBars days={summary.byDay} />
          <UsageByModelTable models={summary.byModel} />
        </Flex>
      )
    }
  }
}
