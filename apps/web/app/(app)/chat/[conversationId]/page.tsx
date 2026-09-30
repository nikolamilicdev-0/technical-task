import type { Metadata } from 'next'

import { getDictionary } from '@/core/i18n/dictionary'
import { ChatThreadBody } from '@/features/chat/components/ChatThreadBody'

export const metadata: Metadata = { title: getDictionary().chat.conversationMetaTitle }

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  return <ChatThreadBody conversationId={conversationId} />
}
