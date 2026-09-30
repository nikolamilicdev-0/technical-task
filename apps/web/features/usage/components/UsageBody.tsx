import { Container, Flex } from '@kb/ui'

import { PageHeader } from '@/core/components/shell/PageHeader'
import { getDictionary } from '@/core/i18n/dictionary'
import { UsageClient } from '@/features/usage/components/UsageClient'
import { UsageSkeleton } from '@/features/usage/components/UsageSkeleton'
import { getUsageStrings } from '@/features/usage/lib/usage-strings'

interface UsageBodyProps {
  loading?: boolean
}

export function UsageBody({ loading = false }: UsageBodyProps) {
  const strings = getUsageStrings(getDictionary())
  const content = loading ? <UsageSkeleton label={strings.loading} /> : <UsageClient />

  return (
    <Container className="py-8 md:py-10">
      <Flex direction="column" gap="lg">
        <PageHeader title={strings.title} description={strings.description} />
        {content}
      </Flex>
    </Container>
  )
}
