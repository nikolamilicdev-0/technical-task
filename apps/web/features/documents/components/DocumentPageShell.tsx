import { Button, Container, Flex } from '@kb/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { routes } from '@/core/config/routes'
import { getDictionary } from '@/core/i18n/dictionary'
import { icons } from '@/core/icons'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

/** Frame of the create and edit pages: a reading-width column with the way back to the list. */
export function DocumentPageShell({ children }: { children: ReactNode }) {
  const strings = getDocumentsStrings(getDictionary())
  const BackIcon = icons.back

  return (
    <Container size="md" className="py-6 md:py-8">
      <Flex direction="column" gap="lg">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ms-3 self-start text-on-surface-variant"
        >
          <Link href={routes.documents.list}>
            <BackIcon aria-hidden className="rtl:-scale-x-100" />
            {strings.editor.back}
          </Link>
        </Button>
        {children}
      </Flex>
    </Container>
  )
}
