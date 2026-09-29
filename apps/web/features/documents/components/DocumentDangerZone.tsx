import type { Document } from '@kb/contracts'
import { Button, Card, Flex, Text } from '@kb/ui'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'

import { ConfirmDialog } from '@/core/components/dialogs/ConfirmDialog'
import { routes } from '@/core/config/routes'
import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { useDeleteDocument } from '@/features/documents/hooks/useDocumentMutations'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

interface DocumentDangerZoneProps {
  document: Pick<Document, 'id' | 'title'>
}

/** Deleting, behind a confirmation; the list is shown again once the document is gone. */
export function DocumentDangerZone({ document }: DocumentDangerZoneProps) {
  const strings = getDocumentsStrings(useT())
  const router = useRouter()
  const headingId = useId()
  const remove = useDeleteDocument()
  const [confirming, setConfirming] = useState(false)
  const DeleteIcon = icons.delete
  const confirmTitle = interpolate(strings.delete.confirmTitle, { title: document.title })

  const openConfirmation = () => setConfirming(true)
  const confirmDelete = () =>
    remove.mutate(document.id, {
      onSuccess: () => router.replace(routes.documents.list),
      onError: () => setConfirming(false),
    })

  return (
    <Card as="section" aria-labelledby={headingId} className="border-error/30">
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        justify="between"
        gap="md"
        className="sm:items-center"
      >
        <Flex direction="column" gap="xs">
          <Text as="h2" id={headingId} variant="subheading">
            {strings.delete.title}
          </Text>
          <Text tone="muted">{strings.delete.description}</Text>
        </Flex>
        <Button
          variant="outline"
          onClick={openConfirmation}
          className="shrink-0 self-start text-error hover:bg-error-container hover:text-on-error-container sm:self-center"
        >
          <DeleteIcon aria-hidden />
          {strings.delete.action}
        </Button>
      </Flex>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={confirmTitle}
        description={strings.delete.confirmDescription}
        confirmLabel={strings.delete.confirm}
        onConfirm={confirmDelete}
        pending={remove.isPending || remove.isSuccess}
      />
    </Card>
  )
}
