import { Container } from '@kb/ui'
import type { Metadata } from 'next'

import { PageHeader } from '@/core/components/shell/PageHeader'
import { getDictionary } from '@/core/i18n/dictionary'

const { chat } = getDictionary()

export const metadata: Metadata = { title: chat.title }

// Header only: the chat feature fills this page in a later phase.
export default function ChatPage() {
  return (
    <Container className="py-8 md:py-10">
      <PageHeader title={chat.title} description={chat.description} />
    </Container>
  )
}
