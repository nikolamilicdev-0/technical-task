import { Button, Card, EmptyState, Flex } from '@kb/ui'
import Link from 'next/link'

import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

type DocumentsEmptyProps =
  { variant: 'none'; onUpload: () => void } | { variant: 'noMatches'; onClearFilters: () => void }

export function DocumentsEmpty(props: DocumentsEmptyProps) {
  const strings = getDocumentsStrings(useT())
  const AddIcon = icons.add
  const UploadIcon = icons.upload

  if (props.variant === 'noMatches') {
    const clearButton = (
      <Button variant="outline" onClick={props.onClearFilters}>
        {strings.empty.noMatches.clear}
      </Button>
    )
    return (
      <Card padding="none" className="border-dashed">
        <EmptyState
          icon={icons.noMatches}
          title={strings.empty.noMatches.title}
          description={strings.empty.noMatches.description}
          action={clearButton}
        />
      </Card>
    )
  }

  const actions = (
    <Flex wrap justify="center" gap="sm">
      <Button asChild>
        <Link href={routes.documents.new}>
          <AddIcon aria-hidden />
          {strings.actions.new}
        </Link>
      </Button>
      <Button variant="outline" onClick={props.onUpload}>
        <UploadIcon aria-hidden />
        {strings.actions.upload}
      </Button>
    </Flex>
  )

  return (
    <Card padding="none" className="border-dashed">
      <EmptyState
        icon={icons.documents}
        title={strings.empty.none.title}
        description={strings.empty.none.description}
        action={actions}
        className="py-16"
      />
    </Card>
  )
}
