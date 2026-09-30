import { Flex, Grid } from '@kb/ui'
import type { ReactNode } from 'react'

import { ConversationListClient } from '@/features/chat/components/ConversationListClient'

interface ChatLayoutBodyProps {
  /** The thread of the current route. */
  children: ReactNode
}

/**
 * The thread, plus the conversation sidebar from `lg` up (the app's own sidebar takes `md`); it
 * fills the viewport below the shell's `h-14` mobile bar, so only the messages scroll.
 */
export function ChatLayoutBody({ children }: ChatLayoutBodyProps) {
  return (
    <Grid
      columns={1}
      className="h-[calc(100dvh-3.5rem)] grid-rows-[minmax(0,1fr)] md:h-dvh lg:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <Flex
        direction="column"
        className="hidden min-h-0 border-e border-outline-variant bg-surface-container-low lg:flex"
      >
        <ConversationListClient />
      </Flex>
      <Flex direction="column" className="min-h-0 min-w-0">
        {children}
      </Flex>
    </Grid>
  )
}
