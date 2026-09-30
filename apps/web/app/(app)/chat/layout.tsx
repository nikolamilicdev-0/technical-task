import type { ReactNode } from 'react'

import { ChatLayoutBody } from '@/features/chat/components/ChatLayoutBody'

// Shared by /chat and /chat/[id], so the conversation sidebar stays mounted between them.
export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ChatLayoutBody>{children}</ChatLayoutBody>
}
